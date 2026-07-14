import { homeEn } from "./home.en";
import { homeEl } from "./home.el";
import { aboutEn } from "./about.en";
import { aboutEl } from "./about.el";
import type { Locale } from "@/src/types";

export const homeContent = {
  en: homeEn,
  el: homeEl,
} as const;

export const aboutContent = {
  en: aboutEn,
  el: aboutEl,
} as const;

export function getHomeContent(locale: Locale) {
  return homeContent[locale];
}

export function getAboutContent(locale: Locale) {
  return aboutContent[locale];
}
