import { commonEn } from "./en";
import { commonEl } from "./el";
import type { Locale } from "@/src/types";

export const common = {
  en: commonEn,
  el: commonEl,
} as const;

export function getCommon(locale: Locale) {
  return common[locale];
}
