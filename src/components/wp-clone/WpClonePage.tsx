import type { Metadata } from "next";
import type { WpClonePageData } from "@/src/content/wp-clone/pages";
import { BackToTopButton } from "./BackToTopButton";
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
  translationFallback?: {
    requestedLocale: string;
    sourceLocale: string;
    sourcePath: string;
  };
};

const greekAiSeoStats = `
<div class="perf-stats">
  <div class="perf-stat"><h4>98<span>%</span></h4><p>ΠΟΣΟΣΤΟ ΕΠΙΤΥΧΙΑΣ</p></div>
  <div class="perf-stat"><h4>2.5<span>x</span></h4><p>ΜΕΣΗ ΑΠΟΔΟΣΗ</p></div>
  <div class="perf-stat"><h4>10<span>k+</span></h4><p>ΛΕΞΕΙΣ-ΚΛΕΙΔΙΑ</p></div>
</div>`;

function normalizeServiceSectionHtml(page: RuntimeWpClonePage) {
  if (page.path !== "/el/ai-seo-4/" || page.html.includes('class="perf-stats"')) {
    return page.html;
  }

  const chartEnd = '<div class="perf-bar" style="height: 90%;"></div></div></div>';
  return page.html.replace(chartEnd, `${chartEnd}${greekAiSeoStats}`);
}

export function WpClonePage({ page }: { page: RuntimeWpClonePage }) {
  const html = normalizeServiceSectionHtml(page);

  return (
    <div
      className={`wp-clone-root ${page.bodyClass}`}
      data-fallback-source-locale={page.translationFallback?.sourceLocale}
      data-fallback-source-path={page.translationFallback?.sourcePath}
      data-locale={page.locale}
      data-page-path={page.path}
      suppressHydrationWarning
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <BackToTopButton locale={page.locale} />
      <WpCloneBehavior locale={page.locale} pagePath={page.path} />
    </div>
  );
}
