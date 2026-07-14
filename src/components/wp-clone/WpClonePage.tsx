import type { Metadata } from "next";
import type { WpClonePageData } from "@/src/content/wp-clone/pages";
import { WpCloneBehavior } from "./WpCloneBehavior";

export function metadataForWpClonePage(page: WpClonePageData): Metadata {
  return {
    title: page.title,
    description: page.description || undefined,
    alternates: {
      canonical: page.path,
    },
  };
}

export function WpClonePage({ page }: { page: WpClonePageData }) {
  return (
    <div className={`wp-clone-root ${page.bodyClass}`} data-locale={page.locale} suppressHydrationWarning>
      <div dangerouslySetInnerHTML={{ __html: page.html }} />
      <WpCloneBehavior locale={page.locale} />
    </div>
  );
}
