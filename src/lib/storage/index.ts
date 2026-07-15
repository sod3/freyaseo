import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const maxUploadBytes = 10 * 1024 * 1024;

function storageDriver() {
  return (process.env.CMS_STORAGE_DRIVER || "s3").toLowerCase();
}

function safeFileName(name: string) {
  const ext = path.extname(name).toLowerCase();
  const base = path
    .basename(name, ext)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return `${base || "upload"}-${crypto.randomBytes(6).toString("hex")}${ext}`;
}

function assertValidUpload(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Unsupported file type.");
  }
  if (file.size > maxUploadBytes) {
    throw new Error("File is larger than the configured 10MB limit.");
  }
  if (/\.(exe|bat|cmd|com|sh|ps1|msi|jar|php|js)$/i.test(file.name)) {
    throw new Error("Executable uploads are not allowed.");
  }
}

async function uploadLocal(file: File, fileName: string, bytes: Buffer) {
  if (process.env.VERCEL) {
    throw new Error("Local upload storage is not persistent on Vercel. Configure S3-compatible storage.");
  }
  const uploadRoot = process.env.CMS_LOCAL_UPLOAD_DIR;
  if (!uploadRoot) throw new Error("CMS_LOCAL_UPLOAD_DIR is required for local upload storage.");
  const resolvedRoot = path.resolve(uploadRoot);
  const target = path.join(resolvedRoot, fileName);
  if (!target.startsWith(resolvedRoot)) throw new Error("Invalid upload path.");
  await fs.mkdir(resolvedRoot, { recursive: true });
  await fs.writeFile(target, bytes);
  return {
    url: `/uploads/${fileName}`,
    storageKey: target,
    storageDriver: "LOCAL" as const,
  };
}

async function uploadS3(file: File, fileName: string, bytes: Buffer) {
  const bucket = process.env.S3_BUCKET;
  const endpoint = process.env.S3_ENDPOINT;
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !endpoint || !publicBaseUrl || !accessKeyId || !secretAccessKey) {
    throw new Error("S3-compatible storage is not configured.");
  }

  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  const key = `cms/${new Date().getUTCFullYear()}/${fileName}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return {
    url: `${publicBaseUrl.replace(/\/$/, "")}/${key}`,
    storageKey: key,
    storageDriver: "S3" as const,
  };
}

export async function saveUpload(file: File) {
  assertValidUpload(file);
  const fileName = safeFileName(file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  const driver = storageDriver();
  const stored = driver === "local" ? await uploadLocal(file, fileName, bytes) : await uploadS3(file, fileName, bytes);

  return {
    ...stored,
    fileName,
    originalFileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  };
}
