import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const BACKUP_MAGIC = Buffer.from("FREYABK1", "ascii");
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export type BackupStorageDriver = "s3" | "local";

export type BackupStorageState = {
  configured: boolean;
  driver: BackupStorageDriver;
  label: string;
  message?: string;
};

function envValue(value: string | undefined) {
  return (value || "").trim().replace(/^(['"])(.*)\1$/, "$2");
}

function s3Configuration() {
  return {
    endpoint: envValue(process.env.S3_ENDPOINT),
    region: envValue(process.env.S3_REGION) || "auto",
    bucket: envValue(process.env.CMS_BACKUP_BUCKET) || envValue(process.env.S3_BUCKET),
    accessKeyId: envValue(process.env.S3_ACCESS_KEY_ID),
    secretAccessKey: envValue(process.env.S3_SECRET_ACCESS_KEY),
  };
}

function selectedDriver(): BackupStorageDriver {
  const explicit = envValue(process.env.CMS_BACKUP_DRIVER).toLowerCase();
  if (explicit === "local") return "local";
  return "s3";
}

function backupPrefix() {
  return (envValue(process.env.CMS_BACKUP_PREFIX) || "cms-backups")
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "-");
}

export function backupObjectKey(backupId: string, relativeName: string) {
  if (!/^[a-f\d-]{36}$/i.test(backupId)) throw new Error("Invalid backup identifier.");
  const cleanName = relativeName.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleanName || cleanName.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid backup object name.");
  }
  return `${backupPrefix()}/${backupId}/${cleanName}`;
}

export function backupStorageState(): BackupStorageState {
  const driver = selectedDriver();
  if (driver === "local") {
    if (process.env.VERCEL) {
      return {
        configured: false,
        driver,
        label: "Local disk",
        message: "Local backup storage is not durable on this host. Configure S3-compatible backup storage.",
      };
    }
    if (!envValue(process.env.CMS_BACKUP_LOCAL_DIR)) {
      return {
        configured: false,
        driver,
        label: "Local disk",
        message: "CMS_BACKUP_LOCAL_DIR is required when CMS_BACKUP_DRIVER is local.",
      };
    }
    return { configured: true, driver, label: "Encrypted local backup storage" };
  }

  const config = s3Configuration();
  const configured = Boolean(config.endpoint && config.bucket && config.accessKeyId && config.secretAccessKey);
  return {
    configured,
    driver,
    label: "Encrypted S3-compatible backup storage",
    message: configured
      ? undefined
      : "S3_ENDPOINT, S3_BUCKET (or CMS_BACKUP_BUCKET), S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required.",
  };
}

function encryptionSecret() {
  const value = envValue(process.env.CMS_BACKUP_ENCRYPTION_KEY) || envValue(process.env.AUTH_SECRET);
  if (value.length < 32) {
    throw new Error("CMS_BACKUP_ENCRYPTION_KEY or AUTH_SECRET must contain at least 32 characters.");
  }
  return value;
}

function encryptionKey() {
  return crypto.createHash("sha256").update("freya-cms-backup-v1\0").update(encryptionSecret()).digest();
}

export function sha256Hex(bytes: Uint8Array) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function encryptBackupBytes(plainBytes: Uint8Array) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainBytes), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([BACKUP_MAGIC, iv, authTag, ciphertext]);
}

export function decryptBackupBytes(encryptedBytes: Uint8Array) {
  const input = Buffer.from(encryptedBytes);
  const minimumLength = BACKUP_MAGIC.length + IV_BYTES + AUTH_TAG_BYTES;
  if (input.length < minimumLength || !input.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) {
    throw new Error("This is not a supported Freya CMS backup object.");
  }
  const ivStart = BACKUP_MAGIC.length;
  const tagStart = ivStart + IV_BYTES;
  const bodyStart = tagStart + AUTH_TAG_BYTES;
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), input.subarray(ivStart, tagStart));
  decipher.setAuthTag(input.subarray(tagStart, bodyStart));
  return Buffer.concat([decipher.update(input.subarray(bodyStart)), decipher.final()]);
}

function s3Client() {
  const config = s3Configuration();
  if (!config.endpoint || !config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error("S3-compatible backup storage is not configured.");
  }
  return {
    bucket: config.bucket,
    client: new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    }),
  };
}

function backupProviderError(operation: "read" | "write", error: unknown) {
  const providerError = error as Error & { code?: string; name?: string; $metadata?: { httpStatusCode?: number } };
  const status = providerError.$metadata?.httpStatusCode;
  const code = String(providerError.code || providerError.name || "");
  const message = String(providerError.message || "");
  const action = operation === "write" ? "write backup objects" : "read backup objects";

  if (status === 401 || status === 403 || /unauthori[sz]ed|access\s*denied|invalidaccesskey|signaturedoesnotmatch/i.test(`${code} ${message}`)) {
    return new Error(
      `Backup storage could not ${action}: the S3-compatible endpoint rejected its access key. Verify the endpoint jurisdiction, bucket, access-key ID, secret, and object permissions.`,
      { cause: error },
    );
  }
  if (/EPROTO|SSL|TLS|handshake|secure channel/i.test(`${code} ${message}`)) {
    return new Error(
      `Backup storage could not ${action}: its TLS handshake failed. Verify that S3_ENDPOINT is the exact HTTPS endpoint shown by the provider, including any jurisdiction segment.`,
      { cause: error },
    );
  }
  return new Error(`Backup storage could not ${action}: ${message || "the provider request failed."}`, { cause: error });
}

function localBackupPath(key: string) {
  const rootValue = envValue(process.env.CMS_BACKUP_LOCAL_DIR);
  if (!rootValue) throw new Error("CMS_BACKUP_LOCAL_DIR is not configured.");
  const root = path.resolve(rootValue);
  const target = path.resolve(root, ...key.split("/"));
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Invalid local backup path.");
  return target;
}

export async function putBackupObject(key: string, bytes: Uint8Array, contentType = "application/octet-stream") {
  const state = backupStorageState();
  if (!state.configured) throw new Error(state.message || "Backup storage is not configured.");
  const body = Buffer.from(bytes);
  const checksum = sha256Hex(body);

  if (state.driver === "local") {
    const target = localBackupPath(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body, { flag: "wx" });
  } else {
    const { client, bucket } = s3Client();
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "private, no-store",
          Metadata: { "freya-sha256": checksum },
        }),
      );
    } catch (error) {
      throw backupProviderError("write", error);
    }
  }

  return { key, byteSize: body.length, checksum };
}

export async function readBackupObject(key: string) {
  const state = backupStorageState();
  if (!state.configured) throw new Error(state.message || "Backup storage is not configured.");
  if (state.driver === "local") return fs.readFile(localBackupPath(key));

  const { client, bucket } = s3Client();
  try {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) throw new Error("Backup object has no content.");
    return Buffer.from(await response.Body.transformToByteArray());
  } catch (error) {
    throw backupProviderError("read", error);
  }
}
