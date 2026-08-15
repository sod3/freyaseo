import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Document, IndexSpecification } from "mongodb";
import { documentId, mongoClient, mongoCollection, mongoDb } from "@/src/lib/mongo";
import { listAdminChanges } from "./change-history";
import {
  backupObjectKey,
  backupStorageState,
  decryptBackupBytes,
  encryptBackupBytes,
  putBackupObject,
  readBackupObject,
  sha256Hex,
} from "./backup-store";
import { acquireBackupLock, releaseBackupLock, renewBackupLock } from "./backup-lock";
import {
  fallbackRelativeLocalMediaKey,
  localMediaPathCandidates,
  portablePathBasename,
  relativeUploadKeyFromUrl,
} from "./local-media-paths";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const BACKUP_FORMAT = "freya-cms-complete-backup";
const BACKUP_FORMAT_VERSION = 1;

const ARCHIVE_EXCLUDED_COLLECTIONS = new Set([
  "sessions",
  "loginAttempts",
  "passwordResetTokens",
  "websiteBackups",
  "websiteBackupLocks",
  "websiteRestoreOperations",
]);

const RESTORE_EXCLUDED_COLLECTIONS = new Set([
  ...ARCHIVE_EXCLUDED_COLLECTIONS,
  "adminChanges",
  "auditLogs",
  "users",
]);

type BackupIndex = {
  name: string;
  key: Record<string, unknown>;
  options: Record<string, unknown>;
};

type BackupCollection = {
  name: string;
  documents: Document[];
  indexes: BackupIndex[];
};

export type BackupMediaObject = {
  assetId: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  plainChecksum: string;
  encryptedChecksum: string;
  objectKey: string;
  storageDriver: "S3" | "CLOUDINARY" | "LOCAL";
  storageKey: string;
  relativeStorageKey?: string;
  url: string;
};

type WebsiteBackupArchive = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_FORMAT_VERSION;
  backupId: string;
  createdAt: Date;
  databaseName: string;
  excludedCollections: string[];
  restoreExcludedCollections: string[];
  collections: BackupCollection[];
  media: BackupMediaObject[];
};

export type WebsiteBackupRecord = {
  _id: string;
  label: string;
  note: string;
  kind: "manual" | "pre_restore";
  status: "creating" | "complete" | "failed";
  integrityStatus: "pending" | "verified" | "failed";
  createdBy: string;
  createdByEmail: string;
  createdAt: Date;
  completedAt?: Date | null;
  databaseObjectKey?: string | null;
  databaseChecksum?: string | null;
  encryptedObjectChecksum?: string | null;
  archiveByteSize?: number;
  encryptedByteSize?: number;
  collections?: Array<{ name: string; documentCount: number }>;
  documentCount?: number;
  mediaCount?: number;
  mediaByteSize?: number;
  skippedMediaCount?: number;
  errorMessage?: string | null;
  verifiedAt?: Date | null;
  lastRestoredAt?: Date | null;
  sourceBackupId?: string | null;
};

type BackupUser = { id: string; email: string };

type ManagedMediaRead = {
  bytes: Buffer;
  relativeStorageKey?: string;
};

type RestoreOperationRecord = Document & {
  _id: string;
  backupId: string;
  status: string;
  userId: string;
  userEmail: string;
  createdAt: Date;
};

function envValue(value: string | undefined) {
  return (value || "").trim().replace(/^(['"])(.*)\1$/, "$2");
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Backup operation failed.";
  return message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "[database connection]").slice(0, 500);
}

function managedCollectionName(name: string) {
  return Boolean(name && !name.startsWith("system.") && !ARCHIVE_EXCLUDED_COLLECTIONS.has(name));
}

function restorableCollectionName(name: string) {
  return managedCollectionName(name) && !RESTORE_EXCLUDED_COLLECTIONS.has(name);
}

function indexForArchive(index: Record<string, unknown>): BackupIndex | null {
  const name = typeof index.name === "string" ? index.name : "";
  if (!name || name === "_id_" || !index.key || typeof index.key !== "object") return null;
  const options = { ...index };
  delete options.name;
  delete options.key;
  delete options.v;
  delete options.ns;
  delete options.background;
  return { name, key: index.key as Record<string, unknown>, options };
}

async function captureDatabaseSnapshot(backupId: string, lockOperationId: string): Promise<WebsiteBackupArchive> {
  const db = await mongoDb();
  const client = await mongoClient();
  const collectionNames = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((collection) => collection.name)
    .filter(managedCollectionName)
    .sort();
  const session = client.startSession({ snapshot: true });
  const collections: BackupCollection[] = [];

  try {
    for (const name of collectionNames) {
      const collection = db.collection(name);
      const documents = await collection.find({}, { session }).toArray();
      let indexes: BackupIndex[] = [];
      try {
        indexes = (await collection.listIndexes().toArray())
          .map((index) => indexForArchive(index as unknown as Record<string, unknown>))
          .filter((index): index is BackupIndex => Boolean(index));
      } catch {
        indexes = [];
      }
      collections.push({ name, documents, indexes });
      await renewBackupLock(lockOperationId);
    }
  } finally {
    await session.endSession();
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_FORMAT_VERSION,
    backupId,
    createdAt: new Date(),
    databaseName: db.databaseName,
    excludedCollections: Array.from(ARCHIVE_EXCLUDED_COLLECTIONS).sort(),
    restoreExcludedCollections: Array.from(RESTORE_EXCLUDED_COLLECTIONS).sort(),
    collections,
    media: [],
  };
}

function storageS3Client() {
  const endpoint = envValue(process.env.S3_ENDPOINT);
  const bucket = envValue(process.env.S3_BUCKET);
  const accessKeyId = envValue(process.env.S3_ACCESS_KEY_ID);
  const secretAccessKey = envValue(process.env.S3_SECRET_ACCESS_KEY);
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new Error("S3 media storage is not configured.");
  return {
    bucket,
    client: new S3Client({
      endpoint,
      region: envValue(process.env.S3_REGION) || "auto",
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

function maxManagedMediaBytes() {
  const configured = Number(envValue(process.env.CMS_BACKUP_MAX_MEDIA_BYTES));
  return Number.isSafeInteger(configured) && configured > 0 ? configured : 25 * 1024 * 1024;
}

function mediaIdentity(asset: Document) {
  return String(asset.fileName || asset.originalFileName || documentId(asset) || "unknown media");
}

function assertManagedMediaSize(byteSize: number, asset: Document) {
  if (byteSize > maxManagedMediaBytes()) {
    throw new Error(`Managed media "${mediaIdentity(asset)}" exceeds the backup per-file size limit.`);
  }
}

async function limitedResponseBytes(response: Response, asset: Document) {
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredSize) && declaredSize > 0) assertManagedMediaSize(declaredSize, asset);
  if (!response.body) return Buffer.alloc(0);

  const chunks: Uint8Array[] = [];
  const reader = response.body.getReader();
  let byteSize = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteSize += value.byteLength;
    assertManagedMediaSize(byteSize, asset);
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), byteSize);
}

async function readPublicLocalMedia(asset: Document) {
  const relativeStorageKey = relativeUploadKeyFromUrl(String(asset.url || ""));
  const siteValue = envValue(process.env.NEXT_PUBLIC_SITE_URL);
  if (!relativeStorageKey || !siteValue) return null;

  let siteUrl: URL;
  try {
    siteUrl = new URL(siteValue);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(siteUrl.protocol) || siteUrl.username || siteUrl.password) return null;

  const encodedPath = relativeStorageKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const deliveryUrl = new URL(`/uploads/${encodedPath}`, siteUrl.origin);
  let response: Response;
  try {
    response = await fetch(deliveryUrl, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  return { bytes: await limitedResponseBytes(response, asset), relativeStorageKey };
}

async function readLocalManagedMedia(asset: Document): Promise<ManagedMediaRead> {
  const rootValue = envValue(process.env.CMS_LOCAL_UPLOAD_DIR);
  const candidates = localMediaPathCandidates(rootValue, {
    storageKey: String(asset.storageKey || ""),
    fileName: String(asset.fileName || asset.originalFileName || ""),
    url: String(asset.url || ""),
  });

  for (const candidate of candidates) {
    try {
      const stats = await fs.stat(candidate.target);
      if (!stats.isFile()) continue;
      assertManagedMediaSize(stats.size, asset);
      return { bytes: await fs.readFile(candidate.target), relativeStorageKey: candidate.relativeStorageKey };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTDIR") continue;
      throw error;
    }
  }

  const publicCopy = await readPublicLocalMedia(asset);
  if (publicCopy) return publicCopy;

  const expectedKey = fallbackRelativeLocalMediaKey({
    storageKey: String(asset.storageKey || ""),
    fileName: String(asset.fileName || asset.originalFileName || ""),
    url: String(asset.url || ""),
  });
  throw new Error(
    `Managed local media "${mediaIdentity(asset)}" is unavailable on this host${expectedKey ? ` at ${expectedKey}` : ""}. ` +
      "Move it into the configured upload directory or migrate the asset to persistent S3/Cloudinary storage before creating a complete backup.",
  );
}

function localMediaRestorePath(relativeStorageKey: string) {
  if (!relativeStorageKey || relativeStorageKey.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("A local media backup contains an invalid relative path.");
  }
  const rootValue = envValue(process.env.CMS_LOCAL_UPLOAD_DIR);
  if (!rootValue) throw new Error("CMS_LOCAL_UPLOAD_DIR is not configured.");
  const root = path.resolve(rootValue);
  const target = path.resolve(root, ...relativeStorageKey.split("/"));
  const relative = path.relative(root, target);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("A local media restore path is outside the managed upload directory.");
  }
  return target;
}

async function readManagedMedia(asset: Document): Promise<ManagedMediaRead | null> {
  const driver = String(asset.storageDriver || "").toUpperCase();
  const storageKey = String(asset.storageKey || "");
  if (!storageKey || !["S3", "CLOUDINARY", "LOCAL"].includes(driver)) return null;

  if (driver === "S3") {
    const { client, bucket } = storageS3Client();
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
    if (!response.Body) throw new Error(`Managed media ${documentId(asset)} is missing from S3 storage.`);
    const bytes = Buffer.from(await response.Body.transformToByteArray());
    assertManagedMediaSize(bytes.length, asset);
    return { bytes };
  }

  if (driver === "LOCAL") return readLocalManagedMedia(asset);

  const assetUrl = new URL(String(asset.url || ""));
  const cloudName = envValue(process.env.CLOUDINARY_CLOUD_NAME) || (() => {
    try {
      return new URL(envValue(process.env.CLOUDINARY_URL)).hostname;
    } catch {
      return "";
    }
  })();
  if (assetUrl.protocol !== "https:" || assetUrl.hostname !== "res.cloudinary.com" || !assetUrl.pathname.startsWith(`/${cloudName}/`)) {
    throw new Error(`Managed Cloudinary media ${documentId(asset)} has an unexpected delivery URL.`);
  }
  const response = await fetch(assetUrl, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Managed Cloudinary media ${documentId(asset)} could not be downloaded.`);
  return { bytes: await limitedResponseBytes(response, asset) };
}

async function backupManagedMedia(archive: WebsiteBackupArchive, lockOperationId: string) {
  const mediaCollection = archive.collections.find((collection) => collection.name === "mediaAssets");
  if (!mediaCollection) return { media: [] as BackupMediaObject[], skipped: 0 };
  const media: BackupMediaObject[] = [];
  let skipped = 0;

  for (const [index, asset] of mediaCollection.documents.entries()) {
    const managedMedia = await readManagedMedia(asset);
    if (!managedMedia) {
      skipped += 1;
      continue;
    }
    const { bytes } = managedMedia;
    const assetId = documentId(asset) || String(index);
    const encrypted = encryptBackupBytes(bytes);
    const objectKey = backupObjectKey(archive.backupId, `media/${String(index).padStart(6, "0")}.bin`);
    const stored = await putBackupObject(objectKey, encrypted);
    media.push({
      assetId,
      fileName: String(asset.fileName || asset.originalFileName || `media-${index}`),
      contentType: String(asset.mimeType || "application/octet-stream"),
      byteSize: bytes.length,
      plainChecksum: sha256Hex(bytes),
      encryptedChecksum: stored.checksum,
      objectKey,
      storageDriver: String(asset.storageDriver || "").toUpperCase() as BackupMediaObject["storageDriver"],
      storageKey: String(asset.storageKey || ""),
      relativeStorageKey: String(asset.storageDriver || "").toUpperCase() === "LOCAL" ? managedMedia.relativeStorageKey : undefined,
      url: String(asset.url || ""),
    });
    await renewBackupLock(lockOperationId);
  }

  return { media, skipped };
}

let mongoModulePromise: Promise<typeof import("mongodb")> | undefined;

async function serializeArchive(archive: WebsiteBackupArchive) {
  mongoModulePromise ||= import("mongodb");
  const { BSON } = await mongoModulePromise;
  return Buffer.from(BSON.EJSON.stringify(archive, { relaxed: false }), "utf8");
}

async function parseArchive(bytes: Uint8Array) {
  mongoModulePromise ||= import("mongodb");
  const { BSON } = await mongoModulePromise;
  const parsed = BSON.EJSON.parse(Buffer.from(bytes).toString("utf8"), { relaxed: false }) as WebsiteBackupArchive;
  if (parsed?.format !== BACKUP_FORMAT || parsed.version !== BACKUP_FORMAT_VERSION || !Array.isArray(parsed.collections)) {
    throw new Error("Backup archive format or version is not supported.");
  }
  return parsed;
}

export async function createWebsiteBackup(
  input: { label: string; note?: string; kind?: WebsiteBackupRecord["kind"]; sourceBackupId?: string | null },
  user: BackupUser,
  options: { lockAlreadyHeld?: boolean; backupId?: string; lockOperationId?: string } = {},
) {
  const backupId = options.backupId || crypto.randomUUID();
  const backups = await mongoCollection<WebsiteBackupRecord>("websiteBackups");
  const kind = input.kind || "manual";
  const label = input.label.trim().slice(0, 120) || `Backup ${new Date().toISOString()}`;
  const note = String(input.note || "").trim().slice(0, 600);
  if (!options.lockAlreadyHeld) await acquireBackupLock("backup", backupId, user.id);

  await backups.insertOne({
    _id: backupId,
    label,
    note,
    kind,
    status: "creating",
    integrityStatus: "pending",
    createdBy: user.id,
    createdByEmail: user.email,
    createdAt: new Date(),
    completedAt: null,
    databaseObjectKey: null,
    databaseChecksum: null,
    encryptedObjectChecksum: null,
    sourceBackupId: input.sourceBackupId || null,
    errorMessage: null,
  });

  try {
    const storage = backupStorageState();
    if (!storage.configured) throw new Error(storage.message || "Backup storage is not configured.");
    const lockOperationId = options.lockOperationId || backupId;
    const archive = await captureDatabaseSnapshot(backupId, lockOperationId);
    const mediaResult = await backupManagedMedia(archive, lockOperationId);
    archive.media = mediaResult.media;
    const serialized = await serializeArchive(archive);
    const compressed = await gzipAsync(serialized, { level: 9 });
    const databaseChecksum = sha256Hex(compressed);
    const encrypted = encryptBackupBytes(compressed);
    const objectKey = backupObjectKey(backupId, "database.fbackup");
    const stored = await putBackupObject(objectKey, encrypted, "application/vnd.freya.cms-backup");
    const collections = archive.collections.map((collection) => ({ name: collection.name, documentCount: collection.documents.length }));
    const documentCount = collections.reduce((sum, collection) => sum + collection.documentCount, 0);
    const mediaByteSize = archive.media.reduce((sum, item) => sum + item.byteSize, 0);

    await backups.updateOne(
      { _id: backupId },
      {
        $set: {
          status: "complete",
          integrityStatus: "pending",
          completedAt: new Date(),
          databaseObjectKey: objectKey,
          databaseChecksum,
          encryptedObjectChecksum: stored.checksum,
          archiveByteSize: compressed.length,
          encryptedByteSize: encrypted.length,
          collections,
          documentCount,
          mediaCount: archive.media.length,
          mediaByteSize,
          skippedMediaCount: mediaResult.skipped,
          verifiedAt: null,
        },
      },
    );
    await readVerifiedArchive(backupId, true, lockOperationId);
    await backups.updateOne(
      { _id: backupId },
      { $set: { integrityStatus: "verified", verifiedAt: new Date() } },
    );
    return backupId;
  } catch (error) {
    await backups.updateOne(
      { _id: backupId },
      { $set: { status: "failed", integrityStatus: "failed", errorMessage: safeErrorMessage(error), completedAt: new Date() } },
    );
    throw error;
  } finally {
    if (!options.lockAlreadyHeld) await releaseBackupLock(backupId);
  }
}

async function readVerifiedArchive(backupId: string, verifyMedia: boolean, lockOperationId?: string) {
  const backups = await mongoCollection<WebsiteBackupRecord>("websiteBackups");
  const record = await backups.findOne({ _id: backupId, status: "complete" });
  if (!record?.databaseObjectKey || !record.databaseChecksum || !record.encryptedObjectChecksum) {
    throw new Error("Backup is incomplete or unavailable.");
  }
  const encrypted = await readBackupObject(record.databaseObjectKey);
  if (sha256Hex(encrypted) !== record.encryptedObjectChecksum) throw new Error("Encrypted backup checksum does not match.");
  const compressed = decryptBackupBytes(encrypted);
  if (sha256Hex(compressed) !== record.databaseChecksum) throw new Error("Backup data checksum does not match.");
  const archive = await parseArchive(await gunzipAsync(compressed));
  if (archive.backupId !== backupId) throw new Error("Backup identity does not match its manifest.");

  if (verifyMedia) {
    for (const media of archive.media) {
      const mediaEncrypted = await readBackupObject(media.objectKey);
      if (sha256Hex(mediaEncrypted) !== media.encryptedChecksum) throw new Error(`Media checksum failed for ${media.fileName}.`);
      const bytes = decryptBackupBytes(mediaEncrypted);
      if (bytes.length !== media.byteSize || sha256Hex(bytes) !== media.plainChecksum) {
        throw new Error(`Media integrity check failed for ${media.fileName}.`);
      }
      if (lockOperationId) await renewBackupLock(lockOperationId);
    }
  }
  return { archive, record };
}

export async function verifyWebsiteBackup(backupId: string) {
  const backups = await mongoCollection<WebsiteBackupRecord>("websiteBackups");
  try {
    await readVerifiedArchive(backupId, true);
    await backups.updateOne({ _id: backupId }, { $set: { integrityStatus: "verified", verifiedAt: new Date(), errorMessage: null } });
    return true;
  } catch (error) {
    await backups.updateOne(
      { _id: backupId },
      { $set: { integrityStatus: "failed", verifiedAt: new Date(), errorMessage: safeErrorMessage(error) } },
    );
    throw error;
  }
}

function cloudinaryConfiguration() {
  let fromUrl: { cloudName?: string; apiKey?: string; apiSecret?: string } = {};
  try {
    const url = new URL(envValue(process.env.CLOUDINARY_URL));
    if (url.protocol === "cloudinary:") {
      fromUrl = { cloudName: url.hostname, apiKey: decodeURIComponent(url.username), apiSecret: decodeURIComponent(url.password) };
    }
  } catch {
    fromUrl = {};
  }
  return {
    cloudName: envValue(process.env.CLOUDINARY_CLOUD_NAME) || fromUrl.cloudName,
    apiKey: envValue(process.env.CLOUDINARY_API_KEY) || fromUrl.apiKey,
    apiSecret: envValue(process.env.CLOUDINARY_API_SECRET) || fromUrl.apiSecret,
  };
}

function cloudinarySignature(params: Record<string, string | number | boolean>, apiSecret: string) {
  const value = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${key}=${String(item)}`)
    .join("&");
  return crypto.createHash("sha1").update(`${value}${apiSecret}`).digest("hex");
}

async function restoreCloudinaryMedia(media: BackupMediaObject, bytes: Uint8Array) {
  const config = cloudinaryConfiguration();
  if (!config.cloudName || !config.apiKey || !config.apiSecret) throw new Error("Cloudinary restore credentials are not configured.");
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: true, overwrite: true, public_id: media.storageKey, timestamp };
  const form = new FormData();
  form.set("file", new Blob([Buffer.from(bytes)], { type: media.contentType }), media.fileName);
  form.set("api_key", config.apiKey);
  form.set("invalidate", "true");
  form.set("overwrite", "true");
  form.set("public_id", media.storageKey);
  form.set("timestamp", String(timestamp));
  form.set("signature", cloudinarySignature(params, config.apiSecret));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/auto/upload`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const payload = (await response.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !payload.secure_url) throw new Error(`Cloudinary media restore failed: ${payload.error?.message || response.statusText}.`);
  return payload.secure_url;
}

async function restoreArchiveMedia(archive: WebsiteBackupArchive, lockOperationId: string) {
  const urlMap = new Map<string, string>();
  for (const media of archive.media) {
    const encrypted = await readBackupObject(media.objectKey);
    if (sha256Hex(encrypted) !== media.encryptedChecksum) throw new Error(`Media checksum failed for ${media.fileName}.`);
    const bytes = decryptBackupBytes(encrypted);
    if (sha256Hex(bytes) !== media.plainChecksum) throw new Error(`Media integrity check failed for ${media.fileName}.`);

    if (media.storageDriver === "S3") {
      const { client, bucket } = storageS3Client();
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: media.storageKey, Body: bytes, ContentType: media.contentType }));
    } else if (media.storageDriver === "LOCAL") {
      const target = localMediaRestorePath(media.relativeStorageKey || portablePathBasename(media.storageKey));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, bytes);
      if (target !== media.storageKey) urlMap.set(media.storageKey, target);
    } else {
      const restoredUrl = await restoreCloudinaryMedia(media, bytes);
      if (media.url && restoredUrl !== media.url) urlMap.set(media.url, restoredUrl);
    }
    await renewBackupLock(lockOperationId);
  }
  return urlMap;
}

function replaceRestoredUrls(value: unknown, urlMap: Map<string, string>): unknown {
  if (typeof value === "string") {
    let output = value;
    for (const [from, to] of urlMap) output = output.includes(from) ? output.split(from).join(to) : output;
    return output;
  }
  if (Array.isArray(value)) return value.map((item) => replaceRestoredUrls(item, urlMap));
  if (!value || typeof value !== "object") return value;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, replaceRestoredUrls(item, urlMap)]));
}

async function restoreIndexes(collectionName: string, indexes: BackupIndex[]) {
  const collection = (await mongoDb()).collection(collectionName);
  for (const index of indexes) {
    try {
      await collection.createIndex(index.key as unknown as IndexSpecification, { ...index.options, name: index.name });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/already exists|equivalent index/i.test(message)) throw error;
    }
  }
}

async function applyDatabaseArchive(archive: WebsiteBackupArchive, urlMap = new Map<string, string>()) {
  const db = await mongoDb();
  const client = await mongoClient();
  const targetCollections = archive.collections.filter((collection) => restorableCollectionName(collection.name));
  const targetNames = new Set(targetCollections.map((collection) => collection.name));
  const currentNames = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((collection) => collection.name)
    .filter(restorableCollectionName);
  const session = client.startSession();

  try {
    await session.withTransaction(
      async () => {
        for (const name of currentNames) await db.collection(name).deleteMany({}, { session });
        for (const collection of targetCollections) {
          const documents = collection.documents.map((document) => replaceRestoredUrls(document, urlMap) as Document);
          for (let offset = 0; offset < documents.length; offset += 250) {
            await db.collection(collection.name).insertMany(documents.slice(offset, offset + 250), { session, ordered: true });
          }
        }
        void targetNames;
      },
      { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, maxCommitTimeMS: 30_000 },
    );
  } finally {
    await session.endSession();
  }

  for (const collection of targetCollections) await restoreIndexes(collection.name, collection.indexes);
}

export async function restoreWebsiteBackup(backupId: string, user: BackupUser) {
  const operationId = crypto.randomUUID();
  const operations = await mongoCollection<RestoreOperationRecord>("websiteRestoreOperations");
  const backups = await mongoCollection<WebsiteBackupRecord>("websiteBackups");
  await acquireBackupLock("restore", operationId, user.id);
  await operations.insertOne({
    _id: operationId,
    backupId,
    status: "verifying",
    userId: user.id,
    userEmail: user.email,
    createdAt: new Date(),
  });
  let safetyBackupId: string | null = null;

  try {
    const target = await readVerifiedArchive(backupId, true, operationId);
    await operations.updateOne({ _id: operationId }, { $set: { status: "creating_safety_backup" } });
    safetyBackupId = crypto.randomUUID();
    await createWebsiteBackup(
      { label: `Before restoring ${target.record.label}`, note: "Automatic safety checkpoint. Restore this backup to undo the restore.", kind: "pre_restore", sourceBackupId: backupId },
      user,
      { lockAlreadyHeld: true, backupId: safetyBackupId, lockOperationId: operationId },
    );
    await operations.updateOne({ _id: operationId }, { $set: { status: "restoring", safetyBackupId } });
    const urlMap = await restoreArchiveMedia(target.archive, operationId);
    await applyDatabaseArchive(target.archive, urlMap);
    await backups.updateOne({ _id: backupId }, { $set: { lastRestoredAt: new Date() } });
    await operations.updateOne({ _id: operationId }, { $set: { status: "complete", completedAt: new Date() } });
    return { safetyBackupId };
  } catch (error) {
    let rollbackError: unknown = null;
    if (safetyBackupId) {
      try {
        const safety = await readVerifiedArchive(safetyBackupId, true, operationId);
        const rollbackUrlMap = await restoreArchiveMedia(safety.archive, operationId);
        await applyDatabaseArchive(safety.archive, rollbackUrlMap);
      } catch (caught) {
        rollbackError = caught;
      }
    }
    await operations.updateOne(
      { _id: operationId },
      {
        $set: {
          status: rollbackError ? "rollback_failed" : safetyBackupId ? "rolled_back" : "failed",
          errorMessage: safeErrorMessage(error),
          rollbackErrorMessage: rollbackError ? safeErrorMessage(rollbackError) : null,
          completedAt: new Date(),
        },
      },
    );
    if (rollbackError) throw new Error("Restore failed and the automatic rollback also failed. Use the safety backup immediately.");
    throw error;
  } finally {
    await releaseBackupLock(operationId);
  }
}

export async function getBackupDashboardData() {
  const [backups, changes] = await Promise.all([
    (await mongoCollection<WebsiteBackupRecord>("websiteBackups")).find({}).sort({ createdAt: -1 }).limit(50).toArray(),
    listAdminChanges(50),
  ]);
  return { backups, changes, storage: backupStorageState() };
}

export async function getDownloadableBackup(backupId: string) {
  const backup = await (await mongoCollection<WebsiteBackupRecord>("websiteBackups")).findOne({ _id: backupId, status: "complete" });
  if (!backup?.databaseObjectKey) throw new Error("Backup is unavailable.");
  return { backup, bytes: await readBackupObject(backup.databaseObjectKey) };
}
