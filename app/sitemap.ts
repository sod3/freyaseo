import type { MetadataRoute } from "next";
import { getCmsBlogPosts } from "@/src/lib/cms/blog";
import { getAllCmsWpClonePages, getAllWpClonePagePaths } from "@/src/lib/cms/wp-pages";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.freyaseo.com";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cmsPages, englishPosts, greekPosts] = await Promise.all([
    getAllCmsWpClonePages(),
    getCmsBlogPosts("en"),
    getCmsBlogPosts("el"),
  ]);
  const noIndexPaths = new Set(
    cmsPages
      .filter((page) => page.status !== "published" || page.seo?.robotsIndex === false)
      .map((page) => page.path),
  );
  const paths = (await getAllWpClonePagePaths()).filter((path) => !noIndexPaths.has(path));

  const pageEntries = paths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date("2026-07-14"),
    changeFrequency: "monthly" as const,
    priority: path === "/" || path === "/el/seo-agency/" ? 1 : 0.8,
  }));
  const blogEntries = [...englishPosts, ...greekPosts].map((post) => ({
    url: `${siteUrl}${post.locale === "el" ? "/el/seo-blog/" : "/blog/"}${post.slug}/`,
    lastModified: new Date(post.publicationDate),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...pageEntries, ...blogEntries];
}
