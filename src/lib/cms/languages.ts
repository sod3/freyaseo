import { cache } from "react";
import { normalizeLanguageSettings, type CmsLanguageSettings } from "./language-utils";
import { readSingleton } from "./reader";

export * from "./language-utils";

export const getLanguageSettings = cache(async () => {
  const settings = await readSingleton<CmsLanguageSettings>("languageSettings");
  const normalized = normalizeLanguageSettings(settings);
  const languages = normalized.languages.filter((language) => language.code === "en" || language.code === "el");

  if (!languages.length) return normalized;

  const defaultLanguage = languages.some((language) => language.code === normalized.defaultLanguage)
    ? normalized.defaultLanguage
    : languages[0].code;

  return normalizeLanguageSettings({
    defaultLanguage,
    languages,
  });
});
