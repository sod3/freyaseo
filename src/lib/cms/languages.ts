import { cache } from "react";
import { normalizeLanguageSettings, type CmsLanguageSettings } from "./language-utils";
import { readSingleton } from "./reader";

export * from "./language-utils";

export const getLanguageSettings = cache(async () => {
  const settings = await readSingleton<CmsLanguageSettings>("languageSettings");
  return normalizeLanguageSettings(settings);
});
