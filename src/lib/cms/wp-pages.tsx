import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CmsSectionRenderer } from "@/src/components/cms/CmsSectionRenderer";
import { WpClonePage } from "@/src/components/wp-clone/WpClonePage";
import { normalizePath, siteUrl as fallbackSiteUrl } from "@/src/content/route-map";
import { getCmsBlogPosts } from "@/src/lib/cms/blog";
import { getLanguageSettings } from "@/src/lib/cms/languages";
import { resolveCmsPageAlternates, resolveCmsPageForPath, type CmsRouteResolution } from "@/src/lib/cms/routing";
import { isMongoConfigured, mongoCollection, tryMongo } from "@/src/lib/mongo";
import {
  getWpClonePageByPath as getLegacyWpClonePageByPath,
  wpClonePagesByPath,
  type WpClonePageData,
} from "@/src/content/wp-clone/pages";
import {
  getCmsPageRouteIndex,
  getCmsPageRouteIndexResult,
  readLocalCmsPageBySourceSlug,
  type CmsPageRouteEntry,
} from "./page-index";
import { readCollection } from "./reader";
import { readSingleton } from "./reader";
import { getCmsContentReplacements } from "./content-overlays";
import type { CmsFooterSettings, CmsNavigationSettings, CmsSiteSettings } from "./site-chrome-html";

type Locale = string;
type CmsStatus = "published" | "draft" | "hidden" | "soft_deleted";

type LocalizedString = {
  [locale: string]: string | undefined;
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
  language?: Locale;
  translationKey?: string;
  translationGroup?: string;
  status?: CmsStatus;
  alternatePath?: string;
  bodyClass?: string;
  html?: string;
  renderMode?: "wordpressHtml" | "structuredBlocks";
  sections?: Array<{ discriminant: string; value?: Record<string, unknown> }>;
  seo?: CmsSeo;
  deletedAt?: unknown;
};

type CmsRedirectEntry = {
  sourceUrl: string;
  destinationUrl: string;
  permanent?: boolean;
  active?: boolean;
};

export type CmsWpClonePage = Omit<WpClonePageData, "locale"> & {
  locale: Locale;
  language?: Locale;
  status: CmsStatus;
  translationKey?: string;
  translationGroup?: string;
  alternatePath?: string;
  renderMode?: "wordpressHtml" | "structuredBlocks";
  sections?: Array<{ discriminant: string; value?: Record<string, unknown> }>;
  seo?: CmsSeo;
  deletedAt?: unknown;
  translationFallback?: {
    requestedLocale: string;
    sourceLocale: string;
    sourcePath: string;
  };
};

function absoluteUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl;
  return new URL(pathOrUrl, base).toString();
}

function localized(value: LocalizedString | undefined, locale: Locale) {
  if (!value) return undefined;
  return value[locale] || value.en || value.el || Object.values(value).find(Boolean) || undefined;
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
    const pages = await mongoCollection<CmsPageEntry>("pages");
    return pages.findOne({ path: normalized, deletedAt: null, status: { $ne: "soft_deleted" } });
  },
  ["cms-page-by-path"],
  { tags: ["cms-pages"] },
);

const readCachedMongoRedirect = unstable_cache(
  async (normalized: string) => {
    if (!isMongoConfigured()) return null;
    const redirects = await mongoCollection<CmsRedirectEntry>("redirects");
    return redirects.findOne({ sourceUrl: normalized, active: { $ne: false } });
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
    language: entry.language,
    status: entry.status ?? "published",
    translationKey: entry.translationKey,
    translationGroup: entry.translationGroup,
    alternatePath: entry.alternatePath ? normalizeForLookup(entry.alternatePath) : undefined,
    bodyClass: entry.bodyClass || "",
    html: entry.html || "",
    renderMode: entry.renderMode ?? "wordpressHtml",
    sections: entry.sections,
    seo: entry.seo,
    deletedAt: entry.deletedAt,
  };
}

function getLegacyCmsPages(): CmsWpClonePage[] {
  return Object.values(wpClonePagesByPath).map((page) => ({
    ...page,
    path: normalizeForLookup(page.path),
    locale: page.locale,
    status: "published" as const,
    renderMode: "wordpressHtml" as const,
  }));
}

function applyTranslationFallback(
  page: CmsWpClonePage,
  resolution: Pick<CmsRouteResolution<CmsWpClonePage>, "isFallback" | "requestedLocale" | "requestedPath" | "sourceLocale" | "sourcePath">,
) {
  if (!resolution.isFallback || !resolution.sourceLocale || !resolution.sourcePath) return page;

  return {
    ...page,
    path: resolution.requestedPath,
    locale: resolution.requestedLocale,
    alternatePath: resolution.sourcePath,
    seo: {
      ...page.seo,
      canonicalUrl: page.seo?.canonicalUrl || resolution.sourcePath,
      robotsIndex: false,
    },
    translationFallback: {
      requestedLocale: resolution.requestedLocale,
      sourceLocale: resolution.sourceLocale,
      sourcePath: resolution.sourcePath,
    },
  };
}

export async function getAllCmsWpClonePages() {
  const entries = await readCollection<CmsPageEntry>("pages");
  return entries.map(({ slug, entry }) => toCmsPage(slug, entry));
}

export async function getAllWpClonePagePaths() {
  const routeIndex = await getCmsPageRouteIndexResult();
  const cmsPages = routeIndex.entries;
  const cmsPaths = cmsPages.map((page) => page.path);
  return routeIndex.source === "mongo"
    ? Array.from(new Set(cmsPaths))
    : Array.from(new Set([...cmsPaths, ...Object.keys(wpClonePagesByPath)]));
}

async function getFullCmsPageForRouteEntry(entry: CmsPageRouteEntry) {
  const normalized = normalizeForLookup(entry.path);

  if (shouldReadMongo() && isMongoConfigured()) {
    const result = await tryMongo(() => readCachedMongoPageByPath(normalized));
    if (result.ok) {
      const mongoPage = result.value;
      return mongoPage ? toCmsPage(mongoPage.sourceSlug || mongoPage.slug || normalized, mongoPage) : null;
    }
  }

  const sourceSlug = entry.sourceSlug || entry.slug;
  if (!sourceSlug) return null;

  const localPage = await readLocalCmsPageBySourceSlug<CmsPageEntry>(sourceSlug);
  return localPage ? toCmsPage(sourceSlug, localPage) : null;
}

export async function getCmsWpClonePageByPath(pathname: string) {
  const normalized = normalizeForLookup(pathname);
  const drafts = await draftModeEnabled();
  const mongoResult =
    shouldReadMongo() && isMongoConfigured()
      ? await tryMongo(() => readCachedMongoPageByPath(normalized))
      : null;
  const mongoPage = mongoResult?.ok ? mongoResult.value : null;
  const resolvedPage = mongoPage ? toCmsPage(mongoPage.sourceSlug || mongoPage.slug || normalized, mongoPage) : null;

  if (resolvedPage) {
    if (resolvedPage.status === "published" || drafts) return resolvedPage;
  }

  const languageSettings = await getLanguageSettings();
  const routeIndex = await getCmsPageRouteIndexResult();
  const cmsPages = routeIndex.entries;
  const legacyPages = routeIndex.source === "mongo" ? [] : getLegacyCmsPages();
  const pages = [...cmsPages, ...legacyPages];
  const resolution = resolveCmsPageForPath(pages, normalized, languageSettings, { includeDrafts: drafts });
  if (resolution.page) {
    const routeEntry = resolution.page as CmsPageRouteEntry;
    const fullPage =
      routeEntry.sourceSlug || routeEntry.slug ? await getFullCmsPageForRouteEntry(routeEntry) : (resolution.page as CmsWpClonePage);
    return fullPage ? applyTranslationFallback(fullPage, resolution) : null;
  }

  const legacyPage = routeIndex.source === "local" ? getLegacyWpClonePageByPath(normalized) : null;
  return legacyPage ? { ...legacyPage, status: "published" as const, renderMode: "wordpressHtml" as const } : null;
}

export async function getCmsRedirect(pathname: string) {
  const normalized = normalizeForLookup(pathname);
  if (shouldReadMongo() && isMongoConfigured()) {
    const result = await tryMongo(() => readCachedMongoRedirect(normalized));
    if (result.ok) return result.value;
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

export async function metadataForCmsWpClonePage(page: CmsWpClonePage): Promise<Metadata> {
  const languageSettings = await getLanguageSettings();
  const locale = page.locale;
  const pages = [...(await getCmsPageRouteIndex()), ...getLegacyCmsPages()];
  const { alternates } = resolveCmsPageAlternates(pages, page.path, languageSettings);
  const languageAlternates = Object.fromEntries(alternates.map((alternate) => [alternate.code, absoluteUrl(alternate.href) || alternate.href]));
  const defaultAlternate =
    languageAlternates[languageSettings.defaultLanguage] ||
    absoluteUrl(page.translationFallback?.sourcePath || page.seo?.canonicalUrl || page.path) ||
    page.path;
  const title = localized(page.seo?.title, locale) || page.title;
  const description = localized(page.seo?.description, locale) || page.description || undefined;
  const canonical = absoluteUrl(page.translationFallback?.sourcePath || page.seo?.canonicalUrl || page.path);
  const ogImage = absoluteUrl(page.seo?.openGraphImage || "/og.png");
  const twitterImage = absoluteUrl(page.seo?.twitterImage || page.seo?.openGraphImage || "/og.png");

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates,
        "x-default": defaultAlternate,
      },
    },
    robots: {
      index: !page.translationFallback && page.status === "published" && page.seo?.robotsIndex !== false,
      follow: page.seo?.robotsFollow !== false,
    },
    openGraph: {
      title: localized(page.seo?.openGraphTitle, locale) || title,
      description: localized(page.seo?.openGraphDescription, locale) || description,
      url: canonical,
      siteName: "Freya SEO",
      locale: locale === "el" ? "el_GR" : locale === "en" ? "en_US" : locale,
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

  const blogLocale = page.path === "/blog/" ? "en" : page.path === "/el/seo-blog/" ? "el" : null;
  const [blogPosts, navigationSettings, footerSettings, siteSettings, contentReplacements] = await Promise.all([
    blogLocale ? getCmsBlogPosts(blogLocale) : Promise.resolve(undefined),
    readSingleton<CmsNavigationSettings>("navigationSettings"),
    readSingleton<CmsFooterSettings>("footerSettings"),
    readSingleton<CmsSiteSettings>("siteSettings"),
    getCmsContentReplacements(),
  ]);
  return (
    <WpClonePage
      page={page}
      blogPosts={blogPosts}
      contentReplacements={contentReplacements}
      navigationSettings={navigationSettings}
      footerSettings={footerSettings}
      siteSettings={siteSettings}
    />
  );
}
