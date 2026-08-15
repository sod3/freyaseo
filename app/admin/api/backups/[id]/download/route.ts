import { can, getCurrentAdminUser } from "@/src/lib/admin/auth";
import { getDownloadableBackup } from "@/src/lib/admin/website-backups";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentAdminUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!can(user, "backups.export")) return Response.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  if (!/^[a-f\d-]{36}$/i.test(id)) return Response.json({ error: "Invalid backup identifier." }, { status: 400 });

  try {
    const { backup, bytes } = await getDownloadableBackup(id);
    const safeLabel = backup.label.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "website-backup";
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${safeLabel}-${id.slice(0, 8)}.fbackup"`,
        "Content-Type": "application/vnd.freya.cms-backup",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Backup is unavailable." }, { status: 404 });
  }
}
