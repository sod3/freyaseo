import type { Metadata } from "next";
import { wpClonePages, type WpClonePageKey } from "@/src/content/wp-clone/pages";
import { siteUrl } from "@/src/content/route-map";

export function wpCloneMetadata(pageKey: WpClonePageKey): Metadata {
  const page = wpClonePages[pageKey];

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: `${siteUrl}${page.path}`,
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `${siteUrl}${page.path}`,
      siteName: "Freya SEO Marketing",
      locale: page.locale === "el" ? "el_GR" : "en_US",
      type: "website",
    },
  };
}
