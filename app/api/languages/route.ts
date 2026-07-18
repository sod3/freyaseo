import { NextResponse } from "next/server";
import { normalizePath } from "@/src/content/route-map";
import {
  activeLanguages,
  getLanguageSettings,
  languageLabel,
  languageShortLabel,
} from "@/src/lib/cms/languages";
import { getCmsPageRouteIndex } from "@/src/lib/cms/page-index";
import { resolveCmsPageAlternates } from "@/src/lib/cms/routing";
import { cmsBlogPostPathForLocale, parseCmsBlogPath } from "@/src/lib/cms/blog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pathname = normalizePath(url.searchParams.get("path") || "/");
  const query = url.searchParams.get("query") || "";
  const settings = await getLanguageSettings();
  const languages = activeLanguages(settings);
  const blogPath = parseCmsBlogPath(pathname, settings);

  if (blogPath) {
    return NextResponse.json({
      defaultLanguage: settings.defaultLanguage,
      currentLocale: blogPath.locale,
      languages: languages.map((language) => ({
        code: language.code,
        name: language.name,
        label: languageLabel(language),
        shortLabel: languageShortLabel(language),
        flagEmoji: language.flagEmoji || "",
        textDirection: language.textDirection || "ltr",
        href: `${cmsBlogPostPathForLocale(language.code, blogPath.slug, settings)}${query ? `?${query}` : ""}`,
        exists: language.code === blogPath.locale,
        usingFallback: language.code !== blogPath.locale,
        sourceLocale: blogPath.locale,
        current: language.code === blogPath.locale,
      })),
    });
  }

  const pages = await getCmsPageRouteIndex();
  const resolved = resolveCmsPageAlternates(pages, pathname, settings, { query });
  const alternatesByCode = new Map(resolved.alternates.map((alternate) => [alternate.code, alternate]));

  return NextResponse.json({
    defaultLanguage: settings.defaultLanguage,
    currentLocale: resolved.currentLocale,
    languages: languages.map((language) => ({
      code: language.code,
      name: language.name,
      label: languageLabel(language),
      shortLabel: languageShortLabel(language),
      flagEmoji: language.flagEmoji || "",
      textDirection: language.textDirection || "ltr",
      href: alternatesByCode.get(language.code)?.href || "/",
      exists: alternatesByCode.get(language.code)?.exists || false,
      usingFallback: alternatesByCode.get(language.code)?.usingFallback || false,
      sourceLocale: alternatesByCode.get(language.code)?.sourceLocale || settings.defaultLanguage,
      current: language.code === resolved.currentLocale,
    })),
  });
}
