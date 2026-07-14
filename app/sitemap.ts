import type { MetadataRoute } from "next";
import { allStaticRoutes, siteUrl } from "@/src/content/route-map";
import { blogPosts } from "@/src/content/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = allStaticRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date("2026-07-14"),
    changeFrequency: "monthly" as const,
    priority: path === "/" || path === "/el/seo-agency/" ? 1 : 0.8,
  }));

  const posts = [...blogPosts.en.map((post) => `/blog/${post.slug}/`), ...blogPosts.el.map((post) => `/el/seo-blog/${post.slug}/`)].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date("2026-07-14"),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...posts];
}
