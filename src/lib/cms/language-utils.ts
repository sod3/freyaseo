export type CmsTextDirection = "ltr" | "rtl";

export type CmsLanguage = {
  code: string;
  name: string;
  nativeName?: string;
  shortLabel?: string;
  flagEmoji?: string;
  pathPrefix?: string;
  textDirection?: CmsTextDirection;
  active?: boolean;
  isDefault?: boolean;
};

export type CmsLanguageSettings = {
  defaultLanguage: string;
  languages: CmsLanguage[];
};

export const fallbackLanguageSettings: CmsLanguageSettings = {
  defaultLanguage: "en",
  languages: [
    {
      code: "en",
      name: "English",
      nativeName: "English",
      shortLabel: "EN",
      pathPrefix: "",
      textDirection: "ltr",
      active: true,
      isDefault: true,
    },
    {
      code: "el",
      name: "Greek",
      nativeName: "Greek",
      shortLabel: "EL",
      pathPrefix: "/el",
      textDirection: "ltr",
      active: true,
      isDefault: false,
    },
  ],
};

const languageCodePattern = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/;

const knownLanguageDefaults: Record<string, Pick<CmsLanguage, "name" | "nativeName" | "shortLabel" | "textDirection">> = {
  en: { name: "English", nativeName: "English", shortLabel: "EN", textDirection: "ltr" },
  el: { name: "Greek", nativeName: "Greek", shortLabel: "EL", textDirection: "ltr" },
  fr: { name: "French", nativeName: "Francais", shortLabel: "FR", textDirection: "ltr" },
  de: { name: "German", nativeName: "Deutsch", shortLabel: "DE", textDirection: "ltr" },
  es: { name: "Spanish", nativeName: "Espanol", shortLabel: "ES", textDirection: "ltr" },
  it: { name: "Italian", nativeName: "Italiano", shortLabel: "IT", textDirection: "ltr" },
  pt: { name: "Portuguese", nativeName: "Portugues", shortLabel: "PT", textDirection: "ltr" },
  tr: { name: "Turkish", nativeName: "Turkce", shortLabel: "TR", textDirection: "ltr" },
  nl: { name: "Dutch", nativeName: "Nederlands", shortLabel: "NL", textDirection: "ltr" },
  ar: { name: "Arabic", nativeName: "Arabic", shortLabel: "AR", textDirection: "rtl" },
};

function normalizedText(value?: string) {
  return String(value || "").trim().toLowerCase();
}

const knownDefaultTexts = new Set(
  Object.values(knownLanguageDefaults).flatMap((language) => [language.name, language.nativeName || "", language.shortLabel || ""]).map(normalizedText),
);

function knownTextsForCode(code: string) {
  const defaults = knownLanguageDefaults[code];
  return new Set([defaults?.name, defaults?.nativeName || "", defaults?.shortLabel || ""].map(normalizedText));
}

function shouldUseKnownDefault(code: string, value?: string) {
  const normalized = normalizedText(value);
  const defaults = knownLanguageDefaults[code];
  if (!defaults) return !normalized;
  if (!normalized || normalized === "new language" || normalized === code) return true;
  if (knownTextsForCode(code).has(normalized)) return false;
  return knownDefaultTexts.has(normalized);
}

export function normalizeLanguageCode(value: string) {
  return value.trim().toLowerCase();
}

export function isValidLanguageCode(value: string) {
  return languageCodePattern.test(normalizeLanguageCode(value));
}

export function normalizePathPrefix(value?: string) {
  const prefix = String(value || "").trim();
  if (!prefix || prefix === "/") return "";
  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return normalized.replace(/\/+$/g, "");
}

export function languagePathPrefix(code: string, defaultLanguage = fallbackLanguageSettings.defaultLanguage, explicitPrefix?: string) {
  const normalizedCode = normalizeLanguageCode(code);
  if (typeof explicitPrefix === "string") return normalizePathPrefix(explicitPrefix);
  if (normalizedCode === normalizeLanguageCode(defaultLanguage)) return "";
  return `/${normalizedCode}`;
}

function cleanLanguage(language: CmsLanguage, defaultLanguage: string): CmsLanguage | null {
  const code = normalizeLanguageCode(language.code || "");
  if (!isValidLanguageCode(code)) return null;

  const defaults = knownLanguageDefaults[code];
  const rawName = String(language.name || "").trim();
  const rawNativeName = String(language.nativeName || "").trim();
  const rawShortLabel = String(language.shortLabel || "").trim();
  const name = defaults && shouldUseKnownDefault(code, rawName) ? defaults.name : rawName || defaults?.name || code.toUpperCase();
  const nativeName =
    defaults && shouldUseKnownDefault(code, rawNativeName) ? defaults.nativeName || name : rawNativeName || defaults?.nativeName || name;
  const shortLabel =
    defaults && shouldUseKnownDefault(code, rawShortLabel) ? defaults.shortLabel || code.toUpperCase() : rawShortLabel || defaults?.shortLabel || code.toUpperCase();
  const isDefault = code === normalizeLanguageCode(defaultLanguage) || language.isDefault === true;

  return {
    code,
    name,
    nativeName,
    shortLabel,
    flagEmoji: String(language.flagEmoji || "").trim(),
    pathPrefix: languagePathPrefix(code, defaultLanguage, language.pathPrefix),
    textDirection: language.textDirection === "rtl" || defaults?.textDirection === "rtl" ? "rtl" : "ltr",
    active: language.active !== false,
    isDefault,
  };
}

export function normalizeLanguageSettings(settings?: Partial<CmsLanguageSettings> | null): CmsLanguageSettings {
  const configuredDefault = normalizeLanguageCode(settings?.defaultLanguage || fallbackLanguageSettings.defaultLanguage);
  const rawLanguages = Array.isArray(settings?.languages) && settings.languages.length ? settings.languages : fallbackLanguageSettings.languages;
  const languagesByCode = new Map<string, CmsLanguage>();

  for (const rawLanguage of rawLanguages) {
    const language = cleanLanguage(rawLanguage, configuredDefault);
    if (language) languagesByCode.set(language.code, language);
  }

  if (!languagesByCode.has(configuredDefault)) {
    languagesByCode.set(configuredDefault, {
      code: configuredDefault,
      name: configuredDefault.toUpperCase(),
      nativeName: configuredDefault.toUpperCase(),
      shortLabel: configuredDefault.toUpperCase(),
      pathPrefix: "",
      textDirection: "ltr",
      active: true,
      isDefault: true,
    });
  }

  const languages = Array.from(languagesByCode.values()).map((language) => ({
    ...language,
    isDefault: language.code === configuredDefault,
    pathPrefix: languagePathPrefix(language.code, configuredDefault, language.pathPrefix),
  }));

  languages.sort((left, right) => {
    if (left.code === configuredDefault) return -1;
    if (right.code === configuredDefault) return 1;
    return 0;
  });

  return {
    defaultLanguage: configuredDefault,
    languages,
  };
}

export function activeLanguages(settings: CmsLanguageSettings) {
  const active = settings.languages.filter((language) => language.active !== false);
  return active.length ? active : settings.languages.slice(0, 1);
}

export function languageLabel(language: CmsLanguage) {
  return language.nativeName || language.name || language.code.toUpperCase();
}

export function languageShortLabel(language: CmsLanguage) {
  return language.shortLabel || language.code.toUpperCase();
}

export function detectLanguageFromPath(pathname: string, settings: CmsLanguageSettings) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const prefixedLanguages = settings.languages
    .filter((language) => language.pathPrefix)
    .sort((left, right) => String(right.pathPrefix).length - String(left.pathPrefix).length);

  const match = prefixedLanguages.find((language) => normalized === language.pathPrefix || normalized.startsWith(`${language.pathPrefix}/`));
  return match?.code || settings.defaultLanguage;
}

export function stripLanguagePrefix(pathname: string, language: CmsLanguage) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const prefix = normalizePathPrefix(language.pathPrefix);
  if (!prefix) return normalized || "/";
  if (normalized === prefix) return "/";
  if (normalized.startsWith(`${prefix}/`)) return normalized.slice(prefix.length) || "/";
  return normalized;
}

export function composeLanguagePath(basePath: string, language: CmsLanguage, defaultLanguage: string) {
  const cleanBase = basePath.startsWith("/") ? basePath : `/${basePath}`;
  const prefix = languagePathPrefix(language.code, defaultLanguage, language.pathPrefix);
  if (!prefix) return cleanBase;
  return `${prefix}${cleanBase}`.replace(/\/{2,}/g, "/");
}
