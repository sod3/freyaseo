"use client";

import Link from "next/link";
import { Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { getAlternatePath, getLocaleFromPath } from "@/src/content/route-map";
import { getCommon } from "@/src/content/common";

type LanguageOption = {
  code: string;
  label: string;
  shortLabel: string;
  href: string;
  current: boolean;
};

export function LanguageSwitcher({ pathname }: { pathname: string }) {
  const locale = getLocaleFromPath(pathname);
  const copy = getCommon(locale).language;
  const alternate = getAlternatePath(pathname);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const resolvedAlternate = languages.find((language) => !language.current);

  useEffect(() => {
    let mounted = true;
    const query = typeof window === "undefined" ? "" : window.location.search.replace(/^\?/, "");
    const params = new URLSearchParams({ path: pathname });
    if (query) params.set("query", query);
    fetch(`/api/languages?${params.toString()}`, { headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { languages?: LanguageOption[] } | null) => {
        if (mounted && Array.isArray(payload?.languages)) setLanguages(payload.languages);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [pathname]);

  if (languages.length > 2) {
    return (
      <div className="language-switcher language-switcher-list" aria-label={copy.label}>
        <Languages className="h-4 w-4" aria-hidden />
        {languages.map((language) => (
          <Link href={language.href} key={language.code} aria-current={language.current ? "page" : undefined}>
            {language.shortLabel || language.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <Link href={resolvedAlternate?.href || alternate} className="language-switcher" aria-label={`${copy.label}: ${resolvedAlternate?.label || copy.alternate}`}>
      <Languages className="h-4 w-4" aria-hidden />
      <span>{resolvedAlternate?.shortLabel || copy.alternate}</span>
    </Link>
  );
}
