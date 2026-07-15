import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mimeTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const uploadRoots = [path.join(process.cwd(), ".uploads", "cms"), path.join(process.cwd(), "public", "uploads")];

function resolveUploadPaths(segments: string[]) {
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\") || segment.includes("/"))) {
    return null;
  }

  return uploadRoots
    .map((root) => {
      const target = path.resolve(root, ...segments);
      const relative = path.relative(root, target);
      return relative.startsWith("..") || path.isAbsolute(relative) ? null : target;
    })
    .filter(Boolean) as string[];
}

async function serveUpload(segments: string[], includeBody: boolean) {
  const targets = resolveUploadPaths(segments);
  if (!targets?.length) return new Response("Not found", { status: 404 });

  for (const target of targets) {
    try {
      const stats = await fs.stat(/* turbopackIgnore: true */ target);
      if (!stats.isFile()) continue;

      const ext = path.extname(target).toLowerCase();
      const headers = new Headers({
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(stats.size),
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });

      if (!includeBody) return new Response(null, { headers });
      const bytes = await fs.readFile(/* turbopackIgnore: true */ target);
      return new Response(new Uint8Array(bytes), { headers });
    } catch {
      continue;
    }
  }

  return new Response("Not found", { status: 404 });
}

export async function GET(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  return serveUpload(params.path || [], true);
}

export async function HEAD(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  return serveUpload(params.path || [], false);
}
