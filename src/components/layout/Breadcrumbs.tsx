import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Locale } from "@/src/types";
import { getCommon } from "@/src/content/common";

export function Breadcrumbs({
  locale,
  items,
}: {
  locale: Locale;
  items: Array<{ label: string; href?: string }>;
}) {
  const homeHref = locale === "el" ? "/el/seo-agency/" : "/";
  const homeLabel = getCommon(locale).breadcrumbs.home;
  const allItems = [{ label: homeLabel, href: homeHref }, ...items];

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {allItems.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.href && index < allItems.length - 1 ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
            {index < allItems.length - 1 ? <ChevronRight className="h-4 w-4" aria-hidden /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
