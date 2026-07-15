import type { MetadataRoute } from "next";
import { getAllCmsWpClonePages, getAllWpClonePagePaths } from "@/src/lib/cms/wp-pages";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.freyaseo.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cmsPages = await getAllCmsWpClonePages();
  const noIndexPaths = new Set(
    cmsPages
      .filter((page) => page.status !== "published" || page.seo?.robotsIndex === false)
      .map((page) => page.path),
  );
  const paths = (await getAllWpClonePagePaths()).filter((path) => !noIndexPaths.has(path));

  return paths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date("2026-07-14"),
    changeFrequency: "monthly" as const,
    priority: path === "/" || path === "/el/seo-agency/" ? 1 : 0.8,
  }));
}
