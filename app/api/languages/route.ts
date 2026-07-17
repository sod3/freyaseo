import { NextResponse } from "next/server";
import { normalizePath, routeMap } from "@/src/content/route-map";
import {
  activeLanguages,
  composeLanguagePath,
  detectLanguageFromPath,
  getLanguageSettings,
  languageLabel,
  languageShortLabel,
  stripLanguagePrefix,
  type CmsLanguage,
} from "@/src/lib/cms/languages";
import { isMongoConfigured, mongoCollection } from "@/src/lib/mongo";

export const dynamic = "force-dynamic";

type PageLocaleRecord = Record<string, unknown> & {
  path?: string;
  locale?: string;
  language?: string;
  translationKey?: string;
  translationGroup?: string;
};

function pageLocale(page: PageLocaleRecord, languages: CmsLanguage[], defaultLanguage: string) {
  const explicit = String(page.locale || page.language || "").trim().toLowerCase();
  if (explicit) return explicit;
  const path = normalizePath(String(page.path || "/"));
  const match = languages.find((language) => language.pathPrefix && path.startsWith(`${language.pathPrefix}/`));
  return match?.code || defaultLanguage;
}

async function translatedPagesByLocale(pathname: string, languages: CmsLanguage[], defaultLanguage: string) {
  if (!isMongoConfigured()) return new Map<string, string>();

  try {
    const pages = await mongoCollection<PageLocaleRecord>("pages");
    const current = await pages.findOne(
      { path: pathname, deletedAt: { $ne: true } },
      { projection: { path: 1, locale: 1, language: 1, translationKey: 1, translationGroup: 1 } },
    );
    const translationKey = String(current?.translationKey || current?.translationGroup || "").trim();
    if (!translationKey) return new Map<string, string>();

    const linkedPages = await pages
      .find(
        {
          $or: [{ translationKey }, { translationGroup: translationKey }],
          deletedAt: { $ne: true },
          status: { $ne: "soft_deleted" },
        },
        { projection: { path: 1, locale: 1, language: 1 } },
      )
      .toArray();

    return new Map(
      linkedPages
        .filter((page) => page.path)
        .map((page) => [pageLocale(page, languages, defaultLanguage), normalizePath(String(page.path))]),
    );
  } catch {
    return new Map<string, string>();
  }
}

function basePathForLanguageSwitch(pathname: string, currentLanguage: CmsLanguage) {
  const normalized = normalizePath(pathname);
  if (normalized in routeMap && normalized.startsWith("/el/")) return routeMap[normalized as keyof typeof routeMap];
  return stripLanguagePrefix(normalized, currentLanguage);
}

function fallbackHrefForLanguage(basePath: string, language: CmsLanguage, defaultLanguage: string) {
  if (language.code === "el" && basePath in routeMap) return routeMap[basePath as keyof typeof routeMap];
  return normalizePath(composeLanguagePath(basePath, language, defaultLanguage));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pathname = normalizePath(url.searchParams.get("path") || "/");
  const settings = await getLanguageSettings();
  const languages = activeLanguages(settings);
  const currentLocale = detectLanguageFromPath(pathname, settings);
  const currentLanguage = languages.find((language) => language.code === currentLocale) || languages[0];
  const basePath = basePathForLanguageSwitch(pathname, currentLanguage);
  const translatedPages = await translatedPagesByLocale(pathname, languages, settings.defaultLanguage);

  return NextResponse.json({
    defaultLanguage: settings.defaultLanguage,
    currentLocale,
    languages: languages.map((language) => ({
      code: language.code,
      name: language.name,
      label: languageLabel(language),
      shortLabel: languageShortLabel(language),
      flagEmoji: language.flagEmoji || "",
      textDirection: language.textDirection || "ltr",
      href: translatedPages.get(language.code) || fallbackHrefForLanguage(basePath, language, settings.defaultLanguage),
      current: language.code === currentLocale,
    })),
  });
}
