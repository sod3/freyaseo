import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

function safeInternalPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";
  return value;
}

export async function GET(request: Request) {
  const draft = await draftMode();
  draft.disable();

  const url = new URL(request.url);
  redirect(safeInternalPath(url.searchParams.get("path")));
}
