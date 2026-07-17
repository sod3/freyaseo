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

  const name = String(language.name || code.toUpperCase()).trim();
  const isDefault = code === normalizeLanguageCode(defaultLanguage) || language.isDefault === true;

  return {
    code,
    name,
    nativeName: String(language.nativeName || name).trim(),
    shortLabel: String(language.shortLabel || code.toUpperCase()).trim(),
    flagEmoji: String(language.flagEmoji || "").trim(),
    pathPrefix: languagePathPrefix(code, defaultLanguage, language.pathPrefix),
    textDirection: language.textDirection === "rtl" ? "rtl" : "ltr",
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
