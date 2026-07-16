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

type StorageUploadErrorCode = "configuration" | "permission" | "provider";

export class StorageUploadError extends Error {
  readonly code: StorageUploadErrorCode;
  readonly status: number;

  constructor(message: string, options: { code?: StorageUploadErrorCode; status?: number; cause?: unknown } = {}) {
    super(message);
    this.name = "StorageUploadError";
    this.code = options.code || "provider";
    this.status = options.status || 502;
    if (options.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function envValue(value: string | undefined) {
  return (value || "").trim().replace(/^(['"])(.*)\1$/, "$2");
}

function storageDriver() {
  return (envValue(process.env.CMS_STORAGE_DRIVER) || "s3").toLowerCase();
}

function decodeCloudinaryUrlPart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function cloudinaryConfig() {
  const cloudinaryUrl = envValue(process.env.CLOUDINARY_URL);
  const parsed = cloudinaryUrl
    ? (() => {
        try {
          const url = new URL(cloudinaryUrl);
          if (url.protocol !== "cloudinary:") return {};
          return {
            cloudName: url.hostname,
            apiKey: decodeCloudinaryUrlPart(url.username),
            apiSecret: decodeCloudinaryUrlPart(url.password),
          };
        } catch {
          return {};
        }
      })()
    : {};

  return {
    cloudName: envValue(process.env.CLOUDINARY_CLOUD_NAME) || parsed.cloudName,
    apiKey: envValue(process.env.CLOUDINARY_API_KEY) || parsed.apiKey,
    apiSecret: envValue(process.env.CLOUDINARY_API_SECRET) || parsed.apiSecret,
    folder: envValue(process.env.CLOUDINARY_FOLDER) || "cms",
  };
}

function hasCloudinaryConfig() {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  return Boolean(cloudName && apiKey && apiSecret);
}

function cloudinarySignature(params: Record<string, string | number>, apiSecret: string) {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return crypto.createHash("sha1").update(`${signatureBase}${apiSecret}`).digest("hex");
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Upload failed.");
}

function looksLikePermissionError(message: string) {
  return /access\s*denied|forbidden|missing permissions?|not authorized|not authorised|permission/i.test(message);
}

function cloudinaryUploadErrorMessage(message: string, status: number) {
  const rawMessage = message.trim() || "Cloudinary upload failed.";
  if (/missing permissions?/i.test(rawMessage) && /\bcreate\b/i.test(rawMessage)) {
    return "Cloudinary rejected the upload because the configured API key is missing asset create/upload permission. Use a Cloudinary API key that can create assets in this product environment, update the Cloudinary environment variables in Vercel, then redeploy.";
  }
  if (status === 401 || status === 403 || looksLikePermissionError(rawMessage)) {
    return "Cloudinary rejected the upload credentials. Check that the configured cloud name, API key and API secret belong to the same Cloudinary product environment and that the key can create assets.";
  }
  return `Cloudinary upload failed: ${rawMessage}`;
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
    throw new StorageUploadError("Local upload storage is not persistent on Vercel. Configure S3-compatible storage or Cloudinary.", {
      code: "configuration",
      status: 503,
    });
  }
  const uploadRoot = process.env.CMS_LOCAL_UPLOAD_DIR;
  if (!uploadRoot) {
    throw new StorageUploadError("CMS_LOCAL_UPLOAD_DIR is required for local upload storage.", { code: "configuration", status: 503 });
  }
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
  const bucket = envValue(process.env.S3_BUCKET);
  const endpoint = envValue(process.env.S3_ENDPOINT);
  const publicBaseUrl = envValue(process.env.S3_PUBLIC_BASE_URL);
  const accessKeyId = envValue(process.env.S3_ACCESS_KEY_ID);
  const secretAccessKey = envValue(process.env.S3_SECRET_ACCESS_KEY);
  if (!bucket || !endpoint || !publicBaseUrl || !accessKeyId || !secretAccessKey) {
    throw new StorageUploadError(
      "S3-compatible storage is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_PUBLIC_BASE_URL.",
      { code: "configuration", status: 503 },
    );
  }

  const client = new S3Client({
    region: envValue(process.env.S3_REGION) || "auto",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  const key = `cms/${new Date().getUTCFullYear()}/${fileName}`;
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    const rawMessage = messageFromError(error);
    if (looksLikePermissionError(rawMessage)) {
      throw new StorageUploadError(
        "S3-compatible storage rejected the upload because the configured credentials cannot create objects. Grant PutObject/create permission for the configured bucket and cms/ prefix.",
        { code: "permission", cause: error },
      );
    }
    throw new StorageUploadError(`S3-compatible upload failed: ${rawMessage}`, { cause: error });
  }
  return {
    url: `${publicBaseUrl.replace(/\/$/, "")}/${key}`,
    storageKey: key,
    storageDriver: "S3" as const,
  };
}

type CloudinaryUploadPayload = {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
};

async function uploadCloudinary(file: File, fileName: string) {
  const { cloudName, apiKey, apiSecret, folder } = cloudinaryConfig();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new StorageUploadError("Cloudinary storage is not configured.", { code: "configuration", status: 503 });
  }

  const publicId = path.basename(fileName, path.extname(fileName));
  const timestamp = Math.floor(Date.now() / 1000);
  const signedParams = { folder, public_id: publicId, timestamp };
  const formData = new FormData();
  formData.set("file", file, fileName);
  formData.set("api_key", apiKey);
  formData.set("folder", folder);
  formData.set("public_id", publicId);
  formData.set("timestamp", String(timestamp));
  formData.set("signature", cloudinarySignature(signedParams, apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => ({}))) as CloudinaryUploadPayload;

  if (!response.ok || !payload.secure_url) {
    const rawMessage = payload.error?.message || response.statusText || "Cloudinary upload failed.";
    const isPermissionError = response.status === 401 || response.status === 403 || looksLikePermissionError(rawMessage);
    throw new StorageUploadError(cloudinaryUploadErrorMessage(rawMessage, response.status), {
      code: isPermissionError ? "permission" : "provider",
      cause: payload.error || rawMessage,
    });
  }

  return {
    url: payload.secure_url,
    storageKey: payload.public_id || `${folder}/${publicId}`,
    storageDriver: "CLOUDINARY" as const,
  };
}

export async function saveUpload(file: File) {
  assertValidUpload(file);
  const fileName = safeFileName(file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  const driver = storageDriver();
  let stored;
  if (driver === "local") {
    stored = await uploadLocal(file, fileName, bytes);
  } else if (driver === "cloudinary") {
    stored = await uploadCloudinary(file, fileName);
  } else if (driver === "s3") {
    try {
      stored = await uploadS3(file, fileName, bytes);
    } catch (error) {
      if (!hasCloudinaryConfig()) throw error;
      stored = await uploadCloudinary(file, fileName);
    }
  } else if (hasCloudinaryConfig()) {
    stored = await uploadCloudinary(file, fileName);
  } else {
    throw new Error(`Unsupported CMS_STORAGE_DRIVER "${driver}". Use "s3", "cloudinary", or "local".`);
  }

  return {
    ...stored,
    fileName,
    originalFileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  };
}
