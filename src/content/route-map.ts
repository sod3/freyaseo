import type { Locale, ServiceKey } from "@/src/types";

export const siteUrl = "https://www.freyaseo.com";

export const routeMap = {
  "/": "/el/seo-agency/",
  "/seo-marketing/": "/el/seo-marketing-2/",
  "/ai-seo-2/": "/el/ai-seo-4/",
  "/automation/": "/el/automation-2/",
  "/report/": "/el/report-2/",
  "/tool-generation/": "/el/tool-generation-2/",
  "/certificates/": "/el/certificates-seo/",
  "/about/": "/el/about-us/",
  "/blog/": "/el/seo-blog/",
  "/contact-2/": "/el/lets-contact/",
  "/el/seo-agency/": "/",
  "/el/seo-marketing-2/": "/seo-marketing/",
  "/el/ai-seo-4/": "/ai-seo-2/",
  "/el/automation-2/": "/automation/",
  "/el/report-2/": "/report/",
  "/el/tool-generation-2/": "/tool-generation/",
  "/el/certificates-seo/": "/certificates/",
  "/el/about-us/": "/about/",
  "/el/seo-blog/": "/blog/",
  "/el/lets-contact/": "/contact-2/",
} as const;

export type LocalizedServiceRoute = {
  key: ServiceKey;
  en: string;
  el: string;
};

export const serviceRoutes = [
  { key: "aiSeo", en: "/ai-seo-2/", el: "/el/ai-seo-4/" },
  { key: "automation", en: "/automation/", el: "/el/automation-2/" },
  { key: "reporting", en: "/report/", el: "/el/report-2/" },
  { key: "toolGeneration", en: "/tool-generation/", el: "/el/tool-generation-2/" },
] as const satisfies readonly LocalizedServiceRoute[];

export const serviceRouteByKey = Object.fromEntries(
  serviceRoutes.map((service) => [service.key, service]),
) as Record<ServiceKey, LocalizedServiceRoute>;

export const routeLocales = Object.fromEntries(
  Object.keys(routeMap).map((path) => [path, path.startsWith("/el/") ? "el" : "en"]),
) as Record<string, Locale>;

export function normalizePath(pathname: string) {
  const clean = pathname.split("?")[0].split("#")[0];
  if (clean === "") return "/";
  return clean.endsWith("/") ? clean : `${clean}/`;
}

export function getLocaleFromPath(pathname: string): Locale {
  return normalizePath(pathname).startsWith("/el/") ? "el" : "en";
}

export function getAlternatePath(pathname: string) {
  const normalized = normalizePath(pathname);
  return routeMap[normalized as keyof typeof routeMap] ?? (normalized.startsWith("/el/") ? "/" : "/el/seo-agency/");
}

export function getLocalizedPath(locale: Locale, englishPath: keyof typeof routeMap) {
  if (locale === "en") return englishPath;
  return routeMap[englishPath] ?? "/el/seo-agency/";
}

export function getLocalizedServicePath(locale: Locale, key: ServiceKey) {
  return serviceRouteByKey[key][locale];
}

export const allStaticRoutes = Object.keys(routeMap).filter((path) => !path.includes("["));
