import type { Metadata } from "next";
import { getAlternatePath, siteUrl } from "@/src/content/route-map";
import type { Locale, PageSeo } from "@/src/types";

export function pageMetadata({ title, description, path, locale }: PageSeo): Metadata {
  const alternate = getAlternatePath(path);
  const enPath = locale === "en" ? path : alternate;
  const elPath = locale === "el" ? path : alternate;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}${path}`,
      languages: {
        en: `${siteUrl}${enPath}`,
        el: `${siteUrl}${elPath}`,
        "x-default": `${siteUrl}${enPath}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}${path}`,
      siteName: "Freya SEO",
      locale: locale === "el" ? "el_GR" : "en_US",
      type: "website",
      images: [{ url: `${siteUrl}/og.png`, width: 1200, height: 630, alt: "Freya SEO green analytics interface" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${siteUrl}/og.png`],
    },
  };
}

export function localizedMetadata(
  locale: Locale,
  path: string,
  en: Pick<PageSeo, "title" | "description">,
  el: Pick<PageSeo, "title" | "description">,
) {
  const copy = locale === "el" ? el : en;
  return pageMetadata({ ...copy, path, locale });
}
