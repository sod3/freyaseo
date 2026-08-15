import crypto from "node:crypto";
import fs from "node:fs/promises";
import "dotenv/config";
import { MongoClient } from "mongodb";
import { localMediaPathCandidates } from "../src/lib/admin/local-media-paths.ts";

const apply = process.argv.includes("--apply");
const envValue = (value) => String(value || "").trim().replace(/^(['"])(.*)\1$/, "$2");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function cloudinaryConfig() {
  let parsed = {};
  try {
    const url = new URL(envValue(process.env.CLOUDINARY_URL));
    if (url.protocol === "cloudinary:") {
      parsed = {
        cloudName: url.hostname,
        apiKey: decodeURIComponent(url.username),
        apiSecret: decodeURIComponent(url.password),
      };
    }
  } catch {
    parsed = {};
  }
  return {
    cloudName: envValue(process.env.CLOUDINARY_CLOUD_NAME) || parsed.cloudName,
    apiKey: envValue(process.env.CLOUDINARY_API_KEY) || parsed.apiKey,
    apiSecret: envValue(process.env.CLOUDINARY_API_SECRET) || parsed.apiSecret,
    folder: envValue(process.env.CLOUDINARY_FOLDER) || "cms",
  };
}

function signature(params, apiSecret) {
  const base = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return crypto.createHash("sha1").update(`${base}${apiSecret}`).digest("hex");
}

function publicIdFor(asset, checksum, folder) {
  const original = String(asset.fileName || asset.originalFileName || asset._id);
  const stem = original
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "legacy-media";
  return `${folder.replace(/^\/+|\/+$/g, "")}/migrated/${stem}-${checksum.slice(0, 12)}`;
}

async function uploadAndVerify(asset, bytes, checksum, config) {
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = publicIdFor(asset, checksum, config.folder);
  const params = { invalidate: "true", overwrite: "true", public_id: publicId, timestamp };
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: String(asset.mimeType || "application/octet-stream") }), String(asset.fileName || "media"));
  form.set("api_key", config.apiKey);
  form.set("invalidate", "true");
  form.set("overwrite", "true");
  form.set("public_id", publicId);
  form.set("timestamp", String(timestamp));
  form.set("signature", signature(params, config.apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/auto/upload`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw new Error(`Cloudinary rejected ${asset.fileName || asset._id}: ${payload.error?.message || response.statusText}`);
  }

  const verification = await fetch(payload.secure_url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000) });
  if (!verification.ok) throw new Error(`Cloudinary verification download failed for ${asset.fileName || asset._id}.`);
  const downloaded = Buffer.from(await verification.arrayBuffer());
  if (downloaded.length !== bytes.length || sha256(downloaded) !== checksum) {
    throw new Error(`Cloudinary checksum verification failed for ${asset.fileName || asset._id}.`);
  }

  return { url: payload.secure_url, storageKey: payload.public_id };
}

function replaceString(value, from, to) {
  if (typeof value === "string") return value.includes(from) ? value.split(from).join(to) : value;
  if (Array.isArray(value)) return value.map((item) => replaceString(item, from, to));
  if (!value || typeof value !== "object") return value;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceString(item, from, to)]));
}

const uri = envValue(process.env.MONGODB_URI);
const databaseName = envValue(process.env.MONGODB_DB);
const uploadRoot = envValue(process.env.CMS_LOCAL_UPLOAD_DIR);
const config = cloudinaryConfig();
if (!uri || !databaseName || !uploadRoot) throw new Error("MONGODB_URI, MONGODB_DB and CMS_LOCAL_UPLOAD_DIR are required.");
if (apply && (!config.cloudName || !config.apiKey || !config.apiSecret)) throw new Error("Cloudinary credentials are required with --apply.");

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(databaseName);
  const assets = await db.collection("mediaAssets").find({ storageDriver: { $regex: /^local$/i } }).sort({ _id: 1 }).toArray();
  const prepared = [];

  for (const asset of assets) {
    const candidates = localMediaPathCandidates(uploadRoot, {
      storageKey: String(asset.storageKey || ""),
      fileName: String(asset.fileName || asset.originalFileName || ""),
      url: String(asset.url || ""),
    });
    let source = null;
    for (const candidate of candidates) {
      try {
        const stats = await fs.stat(candidate.target);
        if (stats.isFile()) {
          source = candidate.target;
          break;
        }
      } catch (error) {
        if (!["ENOENT", "ENOTDIR"].includes(error?.code)) throw error;
      }
    }
    if (!source) throw new Error(`Local bytes are missing for ${asset.fileName || asset._id}; migration stopped before changing the database.`);
    const bytes = await fs.readFile(source);
    prepared.push({ asset, bytes, checksum: sha256(bytes), source });
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", localAssetCount: prepared.length, assets: prepared.map(({ asset, bytes, checksum }) => ({ id: String(asset._id), fileName: asset.fileName, bytes: bytes.length, checksum })) }, null, 2));
  if (!apply || prepared.length === 0) process.exitCode = 0;
  else {
    const migrated = [];
    for (const item of prepared) {
      const stored = await uploadAndVerify(item.asset, item.bytes, item.checksum, config);
      migrated.push({ ...item, ...stored });
      console.log(`Verified durable copy for ${item.asset.fileName || item.asset._id}.`);
    }

    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const now = new Date();
        for (const item of migrated) {
          await db.collection("mediaAssets").updateOne(
            { _id: item.asset._id, storageDriver: { $regex: /^local$/i } },
            {
              $set: {
                url: item.url,
                storageKey: item.storageKey,
                storageDriver: "CLOUDINARY",
                fileSize: item.bytes.length,
                updatedAt: now,
                storageMigratedAt: now,
                previousLocalStorage: {
                  url: String(item.asset.url || ""),
                  storageKey: String(item.asset.storageKey || ""),
                  checksum: item.checksum,
                },
              },
            },
            { session },
          );
        }

        const contentCollections = ["pages", "blogPosts", "services", "tools", "certificates", "testimonials", "settings", "forms", "authors", "categories", "tags"];
        for (const collectionName of contentCollections) {
          const exists = await db.listCollections({ name: collectionName }, { nameOnly: true }).hasNext();
          if (!exists) continue;
          const collection = db.collection(collectionName);
          for await (const document of collection.find({}, { session })) {
            let updated = document;
            let changed = false;
            for (const item of migrated) {
              const oldUrl = String(item.asset.url || "");
              if (oldUrl && JSON.stringify(updated).includes(oldUrl)) {
                updated = replaceString(updated, oldUrl, item.url);
                changed = true;
              }
            }
            if (changed) await collection.replaceOne({ _id: document._id }, updated, { session });
          }
        }
      });
    } finally {
      await session.endSession();
    }
    console.log(`Migration complete: ${migrated.length} local asset(s) now use verified Cloudinary storage.`);
  }
} finally {
  await client.close();
}
