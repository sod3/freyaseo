"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { mongoCollection } from "@/src/lib/mongo";
import { BackupBusyError } from "./backup-lock";
import { ChangeConflictError, undoAdminChange } from "./change-history";
import { getRequestMeta, requireAdminUser, verifyCsrfToken } from "./auth";
import { createWebsiteBackup, restoreWebsiteBackup, verifyWebsiteBackup } from "./website-backups";

const uuidSchema = z.string().uuid();
const createSchema = z.object({
  label: z.string().trim().max(120).optional(),
  note: z.string().trim().max(600).optional(),
});

async function auditBackupAction(user: { id: string; email: string }, action: string, entityId: string, details: Record<string, unknown> = {}) {
  const meta = await getRequestMeta();
  await (await mongoCollection("auditLogs")).insertOne({
    userId: user.id,
    action,
    entityType: "website_backup",
    entityId,
    entityName: entityId,
    details: { ...details, user: user.email },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    createdAt: new Date(),
  });
}

function refreshWebsite() {
  ["cms-pages", "cms-blog", "cms-content", "cms-settings", "cms-redirects"].forEach((tag) => updateTag(tag));
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
}

function backupErrorCode(error: unknown) {
  if (error instanceof BackupBusyError) return "backup-busy";
  if (error instanceof ChangeConflictError) return "undo-conflict";
  const message = error instanceof Error ? error.message : "";
  if (/not configured|required/i.test(message)) return "backup-storage";
  if (/checksum|integrity|decrypt|unsupported/i.test(message)) return "backup-integrity";
  return "backup-failed";
}

export async function createWebsiteBackupAction(formData: FormData) {
  if (!(await verifyCsrfToken(formData.get("csrfToken")))) redirect("/admin/backups?error=session");
  const user = await requireAdminUser("backups.export");
  const parsed = createSchema.safeParse({ label: formData.get("label") || undefined, note: formData.get("note") || undefined });
  if (!parsed.success) redirect("/admin/backups?error=validation");

  let backupId = "";
  try {
    backupId = await createWebsiteBackup({ label: parsed.data.label || "Manual website backup", note: parsed.data.note }, user);
    await auditBackupAction(user, "backup.created", backupId);
  } catch (error) {
    redirect(`/admin/backups?error=${backupErrorCode(error)}`);
  }
  revalidatePath("/admin/backups");
  redirect("/admin/backups?notice=backup-created");
}

export async function verifyWebsiteBackupAction(formData: FormData) {
  if (!(await verifyCsrfToken(formData.get("csrfToken")))) redirect("/admin/backups?error=session");
  const user = await requireAdminUser("backups.export");
  const parsed = uuidSchema.safeParse(formData.get("backupId"));
  if (!parsed.success) redirect("/admin/backups?error=validation");
  try {
    await verifyWebsiteBackup(parsed.data);
    await auditBackupAction(user, "backup.verified", parsed.data);
  } catch (error) {
    redirect(`/admin/backups?error=${backupErrorCode(error)}`);
  }
  revalidatePath("/admin/backups");
  redirect("/admin/backups?notice=backup-verified");
}

export async function restoreWebsiteBackupAction(formData: FormData) {
  if (!(await verifyCsrfToken(formData.get("csrfToken")))) redirect("/admin/backups?error=session");
  const user = await requireAdminUser("backups.restore");
  const parsed = uuidSchema.safeParse(formData.get("backupId"));
  if (!parsed.success || formData.get("confirmBackupId") !== parsed.data) redirect("/admin/backups?error=restore-confirmation");
  try {
    const result = await restoreWebsiteBackup(parsed.data, user);
    await auditBackupAction(user, "backup.restored", parsed.data, { safetyBackupId: result.safetyBackupId });
  } catch (error) {
    redirect(`/admin/backups?error=${backupErrorCode(error)}`);
  }
  refreshWebsite();
  redirect("/admin/backups?notice=backup-restored");
}

export async function undoAdminChangeAction(formData: FormData) {
  if (!(await verifyCsrfToken(formData.get("csrfToken")))) redirect("/admin/backups?error=session");
  const user = await requireAdminUser("backups.restore");
  const parsed = uuidSchema.safeParse(formData.get("changeId"));
  if (!parsed.success || formData.get("confirmChangeId") !== parsed.data) redirect("/admin/backups?error=undo-confirmation");
  try {
    const result = await undoAdminChange(parsed.data, user);
    await auditBackupAction(user, "change.undone", parsed.data, { module: result.module, entityId: result.entityId });
  } catch (error) {
    redirect(`/admin/backups?error=${backupErrorCode(error)}`);
  }
  refreshWebsite();
  redirect("/admin/backups?notice=change-undone");
}
