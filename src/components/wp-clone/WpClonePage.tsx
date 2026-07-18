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

const serviceDetailPaths = new Set([
  "/ai-seo-2/",
  "/automation/",
  "/report/",
  "/tool-generation/",
  "/el/ai-seo-4/",
  "/el/automation-2/",
  "/el/report-2/",
  "/el/tool-generation-2/",
]);

const greekAiSeoStats = `
<div class="perf-stats">
  <div class="perf-stat"><h4>98<span>%</span></h4><p>ΠΟΣΟΣΤΟ ΕΠΙΤΥΧΙΑΣ</p></div>
  <div class="perf-stat"><h4>2.5<span>x</span></h4><p>ΜΕΣΗ ΑΠΟΔΟΣΗ</p></div>
  <div class="perf-stat"><h4>10<span>k+</span></h4><p>ΛΕΞΕΙΣ-ΚΛΕΙΔΙΑ</p></div>
</div>`;

function markServiceComparisonSection(html: string) {
  const chartIndex = html.indexOf('class="perf-analytics-card"');
  const offerIndex = html.indexOf("seo-service-text-card");
  if (chartIndex < 0 || offerIndex < chartIndex) return html;

  const sectionPattern = /<div class="([^"]*\be-con-boxed\b[^"]*\be-parent\b[^"]*)"([^>]*)><div class="e-con-inner">/g;
  let sectionMatch: RegExpExecArray | null = null;
  let candidate: RegExpExecArray | null;

  while ((candidate = sectionPattern.exec(html)) && candidate.index < chartIndex) {
    sectionMatch = candidate;
  }

  if (!sectionMatch || sectionMatch[1].includes("freya-service-comparison")) return html;

  const markedSection = sectionMatch[0].replace(
    `class="${sectionMatch[1]}"`,
    `class="${sectionMatch[1]} freya-service-comparison"`,
  );

  return `${html.slice(0, sectionMatch.index)}${markedSection}${html.slice(sectionMatch.index + sectionMatch[0].length)}`;
}

function normalizeServiceSectionHtml(page: RuntimeWpClonePage) {
  if (!serviceDetailPaths.has(page.path)) return page.html;

  let html = page.html;
  if (page.path === "/el/ai-seo-4/" && !html.includes('class="perf-stats"')) {
    const chartEnd = '<div class="perf-bar" style="height: 90%;"></div></div></div>';
    html = html.replace(chartEnd, `${chartEnd}${greekAiSeoStats}`);
  }

  return markServiceComparisonSection(html);
}

export function WpClonePage({ page }: { page: RuntimeWpClonePage }) {
  const html = normalizeServiceSectionHtml(page);
  const serviceDetailClass = serviceDetailPaths.has(page.path) ? " service-detail-page" : "";

  return (
    <div
      className={`wp-clone-root ${page.bodyClass}${serviceDetailClass}`}
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
