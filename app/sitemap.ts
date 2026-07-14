import type { MetadataRoute } from "next";
import { wpClonePagesByPath } from "@/src/content/wp-clone/pages";

const siteUrl = "https://www.freyaseo.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.keys(wpClonePagesByPath).map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date("2026-07-14"),
    changeFrequency: "monthly" as const,
    priority: path === "/" || path === "/el/seo-agency/" ? 1 : 0.8,
  }));
}
