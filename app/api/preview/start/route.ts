import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/src/lib/admin/auth";

function safeInternalPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const user = await getCurrentAdminUser();
  const previewSecret = process.env.CMS_PREVIEW_SECRET;

  if (!user && (!previewSecret || secret !== previewSecret)) {
    return new Response("Invalid preview secret.", { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  redirect(safeInternalPath(url.searchParams.get("path")));
}
