import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { can, getCurrentAdminUser, getRequestMeta } from "@/src/lib/admin/auth";
import { isMongoConfigured, mongoCollection } from "@/src/lib/mongo";
import { saveUpload, StorageUploadError } from "@/src/lib/storage";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function auditUpload(action: string, userId: string | null, title: string | null, details?: unknown) {
  if (!isMongoConfigured()) return;
  const meta = await getRequestMeta();
  await (await mongoCollection("auditLogs")).insertOne({
    userId,
    action,
    entityType: "media",
    entityId: null,
    entityName: title,
    details: details || {},
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    createdAt: new Date(),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentAdminUser();
  if (!user || !can(user, "media.write")) return jsonError("You do not have permission to upload media.", 403);
  if (!isMongoConfigured()) return jsonError("MongoDB is not configured.", 503);

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file !== "object" || !("arrayBuffer" in file) || !("name" in file)) {
      return jsonError("Choose an image file to upload.", 400);
    }

    const stored = await saveUpload(file as File);
    const title = String(formData.get("title") || stored.originalFileName);
    const now = new Date();
    const asset = {
      fileName: stored.fileName,
      originalFileName: stored.originalFileName,
      title,
      url: stored.url,
      storageKey: stored.storageKey,
      storageDriver: stored.storageDriver,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      alt: { en: String(formData.get("altEn") || ""), el: String(formData.get("altEl") || "") },
      caption: { en: "", el: "" },
      description: { en: "", el: "" },
      decorative: false,
      uploadedById: user.id,
      createdAt: now,
      updatedAt: now,
    };

    const result = await (await mongoCollection("mediaAssets")).insertOne(asset);
    await auditUpload("media.uploaded", user.id, title, { source: "inline-editor" });
    revalidateTag("cms-pages", "max");
    revalidateTag("cms-blog", "max");
    revalidatePath("/admin/media");

    return NextResponse.json({
      id: result.insertedId.toHexString(),
      url: stored.url,
      title,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    const status = error instanceof StorageUploadError ? error.status : 400;
    await auditUpload("media.upload_failed", user.id, null, { message, source: "inline-editor" });
    return jsonError(message, status);
  }
}
