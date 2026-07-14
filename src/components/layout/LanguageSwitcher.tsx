"use client";

import Link from "next/link";
import { Languages } from "lucide-react";
import { getAlternatePath, getLocaleFromPath } from "@/src/content/route-map";
import { getCommon } from "@/src/content/common";

export function LanguageSwitcher({ pathname }: { pathname: string }) {
  const locale = getLocaleFromPath(pathname);
  const copy = getCommon(locale).language;
  const alternate = getAlternatePath(pathname);

  return (
    <Link href={alternate} className="language-switcher" aria-label={`${copy.label}: ${copy.alternate}`}>
      <Languages className="h-4 w-4" aria-hidden />
      <span>{copy.alternate}</span>
    </Link>
  );
}
