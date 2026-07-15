import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CmsSectionRenderer } from "@/src/components/cms/CmsSectionRenderer";
import { WpClonePage } from "@/src/components/wp-clone/WpClonePage";
import { getAlternatePath, normalizePath, siteUrl as fallbackSiteUrl } from "@/src/content/route-map";
import { isMongoConfigured, mongoCollection, withMongo } from "@/src/lib/mongo";
import {
  getWpClonePageByPath as getLegacyWpClonePageByPath,
  wpClonePagesByPath,
  type WpClonePageData,
} from "@/src/content/wp-clone/pages";
import { readCollection } from "./reader";

type Locale = "en" | "el";
type CmsStatus = "published" | "draft" | "hidden";

type LocalizedString = {
  en?: string;
  el?: string;
};

type CmsSeo = {
  title?: LocalizedString;
  description?: LocalizedString;
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  openGraphTitle?: LocalizedString;
  openGraphDescription?: LocalizedString;
  openGraphImage?: string | null;
  openGraphImageAlt?: LocalizedString;
  twitterTitle?: LocalizedString;
  twitterDescription?: LocalizedString;
  twitterImage?: string | null;
  twitterCardType?: "summary" | "summary_large_image";
  modifiedDate?: string | null;
};

type CmsPageEntry = {
  sourceSlug?: string;
  slug?: string;
  title: string;
  description?: string;
  path: string;
  locale: Locale;
  status?: CmsStatus;
  alternatePath?: string;
  bodyClass?: string;
  html?: string;
  renderMode?: "wordpressHtml" | "structuredBlocks";
  sections?: Array<{ discriminant: string; value?: Record<string, unknown> }>;
  seo?: CmsSeo;
};

type CmsRedirectEntry = {
  sourceUrl: string;
  destinationUrl: string;
  permanent?: boolean;
  active?: boolean;
};

export type CmsWpClonePage = WpClonePageData & {
  status: CmsStatus;
  alternatePath?: string;
  renderMode?: "wordpressHtml" | "structuredBlocks";
  sections?: Array<{ discriminant: string; value?: Record<string, unknown> }>;
  seo?: CmsSeo;
};

function absoluteUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl;
  return new URL(pathOrUrl, base).toString();
}

function localized(value: LocalizedString | undefined, locale: Locale) {
  return value?.[locale] || value?.en || value?.el || undefined;
}

function normalizeForLookup(pathname: string) {
  return normalizePath(pathname);
}

function shouldReadMongo() {
  const source = process.env.CMS_PUBLIC_SOURCE?.toLowerCase();
  if (source === "local") return false;
  if (source === "mongo") return true;
  return true;
}

async function draftModeEnabled() {
  try {
    const draft = await draftMode();
    return draft.isEnabled;
  } catch {
    return false;
  }
}

const readCachedMongoPageByPath = unstable_cache(
  async (normalized: string) => {
    if (!isMongoConfigured()) return null;
    return withMongo(async () => {
      const pages = await mongoCollection<CmsPageEntry>("pages");
      return pages.findOne({ path: normalized });
    }, null);
  },
  ["cms-page-by-path"],
  { tags: ["cms-pages"] },
);

const readCachedMongoRedirect = unstable_cache(
  async (normalized: string) => {
    if (!isMongoConfigured()) return null;
    return withMongo(async () => {
      const redirects = await mongoCollection<CmsRedirectEntry>("redirects");
      return redirects.findOne({ sourceUrl: normalized, active: { $ne: false } });
    }, null);
  },
  ["cms-redirect-by-source"],
  { tags: ["cms-redirects"] },
);

function toCmsPage(slug: string, entry: CmsPageEntry): CmsWpClonePage {
  return {
    title: entry.title,
    description: entry.description || "",
    path: normalizeForLookup(entry.path || `/${slug}/`),
    locale: entry.locale,
    status: entry.status ?? "published",
    alternatePath: entry.alternatePath ? normalizeForLookup(entry.alternatePath) : undefined,
    bodyClass: entry.bodyClass || "",
    html: entry.html || "",
    renderMode: entry.renderMode ?? "wordpressHtml",
    sections: entry.sections,
    seo: entry.seo,
  };
}

export async function getAllCmsWpClonePages() {
  const entries = await readCollection<CmsPageEntry>("pages");
  return entries.map(({ slug, entry }) => toCmsPage(slug, entry));
}

export async function getAllWpClonePagePaths() {
  const cmsPages = await getAllCmsWpClonePages();
  const cmsPaths = cmsPages.map((page) => page.path);
  return Array.from(new Set([...cmsPaths, ...Object.keys(wpClonePagesByPath)]));
}

export async function getCmsWpClonePageByPath(pathname: string) {
  const normalized = normalizeForLookup(pathname);
  const drafts = await draftModeEnabled();
  const mongoPage = shouldReadMongo() && isMongoConfigured() ? await readCachedMongoPageByPath(normalized) : null;
  const localPage = !mongoPage ? (await getAllCmsWpClonePages()).find((item) => normalizeForLookup(item.path) === normalized) || null : null;
  const resolvedPage = mongoPage ? toCmsPage(mongoPage.sourceSlug || mongoPage.slug || normalized, mongoPage) : localPage;

  if (resolvedPage) {
    if (resolvedPage.status === "published" || drafts) return resolvedPage;
    return null;
  }

  const legacyPage = getLegacyWpClonePageByPath(normalized);
  return legacyPage ? { ...legacyPage, status: "published" as const, renderMode: "wordpressHtml" as const } : null;
}

export async function getCmsRedirect(pathname: string) {
  const normalized = normalizeForLookup(pathname);
  if (shouldReadMongo() && isMongoConfigured()) {
    return readCachedMongoRedirect(normalized);
  }

  const redirects = await readCollection<CmsRedirectEntry>("redirects");
  return redirects.find(({ entry }) => {
    if (entry.active === false) return false;
    const source = normalizeForLookup(entry.sourceUrl);
    const destination = normalizeForLookup(entry.destinationUrl);
    return source === normalized && destination !== normalized;
  })?.entry;
}

export async function redirectFromCmsIfNeeded(pathname: string): Promise<never | void> {
  const cmsRedirect = await getCmsRedirect(pathname);
  if (!cmsRedirect) return;

  redirect(cmsRedirect.destinationUrl);
}

export function metadataForCmsWpClonePage(page: CmsWpClonePage): Metadata {
  const locale = page.locale;
  const alternatePath = page.alternatePath || getAlternatePath(page.path);
  const enPath = locale === "en" ? page.path : alternatePath;
  const elPath = locale === "el" ? page.path : alternatePath;
  const title = localized(page.seo?.title, locale) || page.title;
  const description = localized(page.seo?.description, locale) || page.description || undefined;
  const canonical = absoluteUrl(page.seo?.canonicalUrl || page.path);
  const ogImage = absoluteUrl(page.seo?.openGraphImage || "/og.png");
  const twitterImage = absoluteUrl(page.seo?.twitterImage || page.seo?.openGraphImage || "/og.png");

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: absoluteUrl(enPath),
        el: absoluteUrl(elPath),
        "x-default": absoluteUrl(enPath),
      },
    },
    robots: {
      index: page.status === "published" && page.seo?.robotsIndex !== false,
      follow: page.seo?.robotsFollow !== false,
    },
    openGraph: {
      title: localized(page.seo?.openGraphTitle, locale) || title,
      description: localized(page.seo?.openGraphDescription, locale) || description,
      url: canonical,
      siteName: "Freya SEO",
      locale: locale === "el" ? "el_GR" : "en_US",
      type: "website",
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: localized(page.seo?.openGraphImageAlt, locale) || "Freya SEO",
            },
          ]
        : undefined,
    },
    twitter: {
      card: page.seo?.twitterCardType || "summary_large_image",
      title: localized(page.seo?.twitterTitle, locale) || title,
      description: localized(page.seo?.twitterDescription, locale) || description,
      images: twitterImage ? [twitterImage] : undefined,
    },
  };
}

export async function generateWpCloneMetadata(pathname: string): Promise<Metadata> {
  const page = await getCmsWpClonePageByPath(pathname);
  if (!page) return {};
  return metadataForCmsWpClonePage(page);
}

export async function WpClonePageForPath({ pathname }: { pathname: string }) {
  await redirectFromCmsIfNeeded(pathname);
  const page = await getCmsWpClonePageByPath(pathname);

  if (!page) {
    notFound();
  }

  if (page.renderMode === "structuredBlocks") {
    return <CmsSectionRenderer sections={page.sections} locale={page.locale} />;
  }

  return <WpClonePage page={page} />;
}
