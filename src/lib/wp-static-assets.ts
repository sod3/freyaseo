import fs from "node:fs/promises";
import path from "node:path";

const mimeTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function resolveStaticPath(root: string, segments: string[]) {
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\") || segment.includes("/"))) {
    return null;
  }

  const target = path.resolve(root, ...segments);
  const relative = path.relative(root, target);
  return relative.startsWith("..") || path.isAbsolute(relative) ? null : target;
}

export async function serveStaticAsset(root: string, segments: string[], includeBody: boolean) {
  const target = resolveStaticPath(root, segments);
  if (!target) return new Response("Not found", { status: 404 });

  try {
    const stats = await fs.stat(/* turbopackIgnore: true */ target);
    if (!stats.isFile()) return new Response("Not found", { status: 404 });

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
    return new Response("Not found", { status: 404 });
  }
}
