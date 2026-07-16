import path from "node:path";
import { serveStaticAsset } from "@/src/lib/wp-static-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const root = path.join(process.cwd(), "public", "wp-clone", "wp-includes");

function routeSegments(params: unknown) {
  return (params as { path?: string[] }).path || [];
}

export async function GET(_request: Request, context: { params: Promise<unknown> }) {
  const params = await context.params;
  return serveStaticAsset(root, routeSegments(params), true);
}

export async function HEAD(_request: Request, context: { params: Promise<unknown> }) {
  const params = await context.params;
  return serveStaticAsset(root, routeSegments(params), false);
}
