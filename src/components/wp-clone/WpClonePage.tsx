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

type RuntimeWpClonePage = Omit<WpClonePageData, "locale"> & {
  locale: string;
};

export function WpClonePage({ page }: { page: RuntimeWpClonePage }) {
  return (
    <div className={`wp-clone-root ${page.bodyClass}`} data-locale={page.locale} data-page-path={page.path} suppressHydrationWarning>
      <div dangerouslySetInnerHTML={{ __html: page.html }} />
      <WpCloneBehavior locale={page.locale} pagePath={page.path} />
    </div>
  );
}
