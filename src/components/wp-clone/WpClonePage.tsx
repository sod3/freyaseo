import type { Metadata } from "next";
import { wpClonePagesByPath, type WpClonePageData } from "@/src/content/wp-clone/pages";
import { ServiceEndingCTA } from "@/src/components/services/ServiceEndingCTA";
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

const serviceEndingSectionIds: Record<string, string> = {
  "/ai-seo-2/": "da1df4a",
  "/automation/": "3b48cd1",
  "/report/": "406e2b2b",
  "/tool-generation/": "2a83dc60",
  "/el/ai-seo-4/": "485ed102",
  "/el/automation-2/": "29702722",
  "/el/report-2/": "69c8455a",
  "/el/tool-generation-2/": "12d49d16",
};

const homepagePaths = new Set(["/", "/el/seo-agency/"]);

const homepageHeroCopy = {
  en: ["#1 on Google", "#1 on AI"],
  el: ["στο Google", "στο AI"],
} as const;

const greekAiSeoStats = `
<div class="perf-stats">
  <div class="perf-stat"><h4>98<span>%</span></h4><p>ΠΟΣΟΣΤΟ ΕΠΙΤΥΧΙΑΣ</p></div>
  <div class="perf-stat"><h4>2.5<span>x</span></h4><p>ΜΕΣΗ ΑΠΟΔΟΣΗ</p></div>
  <div class="perf-stat"><h4>10<span>k+</span></h4><p>ΛΕΞΕΙΣ-ΚΛΕΙΔΙΑ</p></div>
</div>`;

function extractFooter(html: string) {
  const footerStart = html.indexOf("<footer");
  const footerEnd = html.lastIndexOf("</footer>");
  if (footerStart < 0 || footerEnd < footerStart) return "";
  return html.slice(footerStart, footerEnd + "</footer>".length);
}

const serviceFooters: Record<string, string> = {
  en: extractFooter(wpClonePagesByPath["/ai-seo-2/"].html),
  el: extractFooter(wpClonePagesByPath["/el/seo-agency/"].html),
};

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

function markServiceEndingSection(html: string, path: string) {
  const sectionId = serviceEndingSectionIds[path];
  if (!sectionId || html.includes("freya-service-ending-cta")) return html;

  const sectionPattern = new RegExp(
    `(<div class=")([^"]*\\belementor-element-${sectionId}\\b[^"]*)("(?=[^>]*\\bdata-id="${sectionId}"[^>]*>))`,
  );

  return html.replace(sectionPattern, (_match, opening, className, closing) => {
    return `${opening}${className} freya-service-ending-cta${closing}`;
  });
}

function ensureServiceFooter(html: string, locale: string) {
  if (html.includes('id="site-footer"')) return html;

  const footer = serviceFooters[locale] || serviceFooters.en;
  if (!footer) return html;

  const siteClose = html.lastIndexOf("</div>");
  if (siteClose < 0) return `${html}${footer}`;
  return `${html.slice(0, siteClose)}${footer}${html.slice(siteClose)}`;
}

function normalizeServiceSectionHtml(page: RuntimeWpClonePage) {
  let html = page.html;
  if (page.path === "/el/ai-seo-4/" && !html.includes('class="perf-stats"')) {
    const chartEnd = '<div class="perf-bar" style="height: 90%;"></div></div></div>';
    html = html.replace(chartEnd, `${chartEnd}${greekAiSeoStats}`);
  }

  html = markServiceComparisonSection(html);

  if (serviceDetailPaths.has(page.path)) {
    html = markServiceEndingSection(html, page.path);
    html = ensureServiceFooter(html, page.locale);
  }

  return html;
}

function normalizeBlogArticleHtml(page: RuntimeWpClonePage, html: string) {
  if (!page.bodyClass.includes("blog-single-layout-modern")) return html;

  const featuredImage = html.match(
    /<div class="entry-image"[^>]*>[\s\S]*?<img[^>]*\ssrc="([^"]+)"/i,
  )?.[1];

  if (!featuredImage) return html;

  const fullSizeFeaturedImage = featuredImage.replace(
    /-\d+x\d+(?=\.[a-z0-9]+(?:\?[^"]*)?$)/i,
    "",
  );
  const safeFeaturedImage = fullSizeFeaturedImage.replace(/'/g, "%27");
  return html.replace(
    /<header class="page-header modern-entry-image" id="page-header">/i,
    `<header class="page-header modern-entry-image" id="page-header" style="background-image:url('${safeFeaturedImage}')">`,
  );
}

function normalizeHomepageHeroHtml(page: RuntimeWpClonePage, html: string) {
  if (!homepagePaths.has(page.path)) return html;

  const footerIndex = html.indexOf("<footer");
  const pageContent = footerIndex >= 0 ? html.slice(0, footerIndex) : html;
  const heroListPattern =
    /<span class="([^"]*\bekit-fancy-text-lists\b[^"]*)"([^>]*)>\s*(<b class="[^"]*"[^>]*>[\s\S]*?<\/b>)\s*(<b class="[^"]*"[^>]*>[\s\S]*?<\/b>)\s*<\/span>/i;
  const match = heroListPattern.exec(pageContent);
  if (!match) return html;

  const locale = page.locale === "el" ? "el" : "en";
  const copy = homepageHeroCopy[locale];
  const normalizeItem = (itemHtml: string, index: number) => {
    return itemHtml.replace(
      /<b class="([^"]*)"([^>]*)>[\s\S]*<\/b>/i,
      (_item, className: string, attributes: string) => {
        const classes = className
          .split(/\s+/)
          .filter(Boolean)
          .filter((name) => !["is-visible", "is-hidden", "is-active", "freya-hero-rotator-item"].includes(name));
        classes.push("freya-hero-rotator-item");
        if (index === 0) classes.push("is-active");

        const cleanAttributes = attributes.replace(/\saria-hidden=(?:"[^"]*"|'[^']*')/gi, "");
        return `<b class="${classes.join(" ")}"${cleanAttributes} aria-hidden="${index !== 0}">${copy[index]}</b>`;
      },
    );
  };

  const listClasses = match[1]
    .split(/\s+/)
    .filter(Boolean)
    .filter((name) => name !== "freya-hero-rotator");
  listClasses.push("freya-hero-rotator");
  const listAttributes = match[2].replace(
    /\s(?:data-freya-hero-rotator|data-freya-rotator-prepared|aria-live|aria-atomic)=(?:"[^"]*"|'[^']*')/gi,
    "",
  );
  const normalizedList = `<span class="${listClasses.join(" ")}"${listAttributes} data-freya-hero-rotator="true" aria-live="polite" aria-atomic="true">
${normalizeItem(match[3], 0)}
${normalizeItem(match[4], 1)}
</span>`;

  return `${html.slice(0, match.index)}${normalizedList}${html.slice(match.index + match[0].length)}`;
}

export function WpClonePage({ page }: { page: RuntimeWpClonePage }) {
  const html = normalizeHomepageHeroHtml(page, normalizeBlogArticleHtml(page, normalizeServiceSectionHtml(page)));
  const isServiceDetail = serviceDetailPaths.has(page.path) || html.includes("freya-service-comparison");
  const serviceDetailClass = isServiceDetail ? " service-detail-page" : "";

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
      {isServiceDetail ? <ServiceEndingCTA pagePath={page.path} /> : null}
    </div>
  );
}
