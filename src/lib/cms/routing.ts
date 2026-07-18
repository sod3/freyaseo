import { normalizePath, routeMap } from "@/src/content/route-map";
import {
  activeLanguages,
  composeLanguagePath,
  detectLanguageFromPath,
  stripLanguagePrefix,
  type CmsLanguage,
  type CmsLanguageSettings,
} from "./languages";

export type CmsRoutablePage = {
  path: string;
  locale?: string;
  language?: string;
  translationKey?: string;
  translationGroup?: string;
  alternatePath?: string;
  status?: string;
  deletedAt?: unknown;
};

export type CmsResolvedAlternate = {
  code: string;
  href: string;
  exists: boolean;
  usingFallback: boolean;
  sourceLocale?: string;
};

export type CmsRouteResolution<T extends CmsRoutablePage> = {
  requestedPath: string;
  requestedLocale: string;
  page: T | null;
  isFallback: boolean;
  sourceLocale?: string;
  sourcePath?: string;
};

function cleanCode(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function isVisiblePage(page: CmsRoutablePage, includeDrafts = false) {
  if (page.deletedAt) return false;
  const status = String(page.status || "published").toLowerCase();
  if (status === "soft_deleted" || status === "archived") return false;
  if (includeDrafts) return true;
  return status === "published";
}

function pagePath(page: CmsRoutablePage) {
  return normalizePath(page.path || "/");
}

export function cmsPageLocale(page: CmsRoutablePage, settings: CmsLanguageSettings) {
  const explicit = cleanCode(page.locale || page.language);
  if (explicit) return explicit;

  const normalized = pagePath(page);
  const matched = settings.languages
    .filter((language) => language.pathPrefix)
    .sort((left, right) => String(right.pathPrefix).length - String(left.pathPrefix).length)
    .find((language) => normalized === language.pathPrefix || normalized.startsWith(`${language.pathPrefix}/`));

  return matched?.code || settings.defaultLanguage;
}

export function cmsPageTranslationKey(page: CmsRoutablePage) {
  return String(page.translationKey || page.translationGroup || "").trim();
}

function legacyDefaultPath(pathname: string) {
  const normalized = normalizePath(pathname);
  if (normalized.startsWith("/el/") && normalized in routeMap) {
    return routeMap[normalized as keyof typeof routeMap];
  }
  return "";
}

function languageForCode(settings: CmsLanguageSettings, code: string) {
  return settings.languages.find((language) => language.code === code);
}

export function defaultBasePathForRequest(pathname: string, settings: CmsLanguageSettings) {
  const normalized = normalizePath(pathname);
  const legacy = legacyDefaultPath(normalized);
  if (legacy) return normalizePath(legacy);

  const requestedLocale = detectLanguageFromPath(normalized, settings);
  const language = languageForCode(settings, requestedLocale);
  return normalizePath(stripLanguagePrefix(normalized, language || settings.languages[0]));
}

function candidateDefaultPaths(pathname: string, settings: CmsLanguageSettings) {
  const normalized = normalizePath(pathname);
  const candidates = new Set<string>([defaultBasePathForRequest(normalized, settings)]);
  const legacy = legacyDefaultPath(normalized);
  if (legacy) candidates.add(normalizePath(legacy));
  return Array.from(candidates).filter(Boolean);
}

function sameTranslationGroup(page: CmsRoutablePage, current: CmsRoutablePage) {
  const key = cmsPageTranslationKey(current);
  const currentPath = pagePath(current);
  const alternatePath = current.alternatePath ? normalizePath(current.alternatePath) : "";

  if (key && cmsPageTranslationKey(page) === key) return true;
  if (alternatePath && pagePath(page) === alternatePath) return true;
  if (page.alternatePath && normalizePath(page.alternatePath) === currentPath) return true;
  return false;
}

function activeVisiblePages<T extends CmsRoutablePage>(pages: T[], includeDrafts = false) {
  return pages.filter((page) => isVisiblePage(page, includeDrafts));
}

export function resolveCmsPageForPath<T extends CmsRoutablePage>(
  pages: T[],
  pathname: string,
  settings: CmsLanguageSettings,
  options: { includeDrafts?: boolean } = {},
): CmsRouteResolution<T> {
  const requestedPath = normalizePath(pathname);
  const requestedLocale = detectLanguageFromPath(requestedPath, settings);
  const visiblePages = activeVisiblePages(pages, options.includeDrafts);
  const exact = visiblePages.find((page) => pagePath(page) === requestedPath) || null;

  if (exact) {
    return {
      requestedPath,
      requestedLocale,
      page: exact,
      isFallback: false,
      sourceLocale: cmsPageLocale(exact, settings),
      sourcePath: pagePath(exact),
    };
  }

  const defaultLanguage = settings.defaultLanguage;
  const defaultPage =
    candidateDefaultPaths(requestedPath, settings)
      .map((candidate) => visiblePages.find((page) => pagePath(page) === candidate && cmsPageLocale(page, settings) === defaultLanguage))
      .find(Boolean) || null;

  if (!defaultPage) {
    return {
      requestedPath,
      requestedLocale,
      page: null,
      isFallback: false,
    };
  }

  return {
    requestedPath,
    requestedLocale,
    page: defaultPage,
    isFallback: requestedLocale !== cmsPageLocale(defaultPage, settings) || requestedPath !== pagePath(defaultPage),
    sourceLocale: cmsPageLocale(defaultPage, settings),
    sourcePath: pagePath(defaultPage),
  };
}

function appendQuery(pathname: string, query?: string) {
  const cleanQuery = String(query || "").trim().replace(/^\?/, "");
  if (!cleanQuery) return normalizePath(pathname);
  return `${normalizePath(pathname)}?${cleanQuery}`;
}

function fallbackPathForLanguage(basePath: string, language: CmsLanguage, settings: CmsLanguageSettings) {
  return normalizePath(composeLanguagePath(basePath, language, settings.defaultLanguage));
}

export function resolveCmsPageAlternates<T extends CmsRoutablePage>(
  pages: T[],
  pathname: string,
  settings: CmsLanguageSettings,
  options: { query?: string; includeDrafts?: boolean } = {},
) {
  const resolution = resolveCmsPageForPath(pages, pathname, settings, options);
  const languages = activeLanguages(settings);
  const visiblePages = activeVisiblePages(pages, options.includeDrafts);
  const currentPage = resolution.page;
  const linkedPages = currentPage
    ? visiblePages.filter((page) => pagePath(page) === pagePath(currentPage) || sameTranslationGroup(page, currentPage))
    : [];
  const defaultPage =
    linkedPages.find((page) => cmsPageLocale(page, settings) === settings.defaultLanguage) ||
    candidateDefaultPaths(pathname, settings)
      .map((candidate) => visiblePages.find((page) => pagePath(page) === candidate && cmsPageLocale(page, settings) === settings.defaultLanguage))
      .find(Boolean) ||
    currentPage;
  const basePath = defaultPage ? stripLanguagePrefix(pagePath(defaultPage), languageForCode(settings, settings.defaultLanguage) || languages[0]) : defaultBasePathForRequest(pathname, settings);

  const alternates: CmsResolvedAlternate[] = languages.map((language) => {
    const exact = linkedPages.find((page) => cmsPageLocale(page, settings) === language.code);
    const fallbackPath = fallbackPathForLanguage(basePath, language, settings);
    const href = exact ? pagePath(exact) : fallbackPath;
    return {
      code: language.code,
      href: appendQuery(href, options.query),
      exists: Boolean(exact),
      usingFallback: !exact,
      sourceLocale: exact ? language.code : cmsPageLocale(defaultPage || currentPage || { path: basePath }, settings),
    };
  });

  return {
    currentLocale: resolution.requestedLocale,
    currentPage,
    defaultPage,
    basePath,
    alternates,
  };
}
