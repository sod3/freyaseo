import { normalizePath, routeMap } from "@/src/content/route-map";

type LocalizedString = Record<string, string | undefined>;

type CmsLink = {
  label?: LocalizedString;
  href?: string;
  url?: string;
  target?: string;
  nofollow?: boolean;
};

export type CmsNavigationSettings = {
  items?: Array<
    CmsLink & {
      mobileLabel?: LocalizedString;
      visibleInEnglish?: boolean;
      visibleInGreek?: boolean;
      order?: number;
      children?: CmsLink[];
    }
  >;
};

export type CmsFooterSettings = {
  quickLinks?: CmsLink[];
  serviceLinks?: CmsLink[];
};

export type CmsSiteSettings = {
  englishLogo?: string | null;
  greekLogo?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function localized(value: LocalizedString | undefined, locale: string) {
  return value?.[locale] || value?.en || value?.el || "";
}

function localizedUrl(value: string | undefined, locale: string) {
  const url = value || "/";
  if (locale !== "el" || /^https?:\/\//i.test(url) || url.startsWith("#") || url.startsWith("/el/")) return url;
  const normalized = normalizePath(url);
  return routeMap[normalized as keyof typeof routeMap] || url;
}

function linkAttributes(link: CmsLink, locale: string) {
  const href = escapeHtml(localizedUrl(link.href || link.url, locale));
  const target = link.target && link.target !== "_self" ? ` target="${escapeHtml(link.target)}"` : "";
  const rel = link.nofollow ? ' rel="nofollow"' : "";
  return `href="${href}"${target}${rel}`;
}

function matchingClosingTagStart(html: string, openingEnd: number, tagName: string) {
  const tags = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tags.lastIndex = openingEnd;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tags.exec(html))) {
    if (match[0].startsWith("</")) depth -= 1;
    else if (!match[0].endsWith("/>")) depth += 1;
    if (depth === 0) return match.index;
  }
  return -1;
}

function renderNavigationItem(item: NonNullable<CmsNavigationSettings["items"]>[number], locale: string, pagePath: string) {
  const children = Array.isArray(item.children) ? item.children : [];
  const href = localizedUrl(item.href || item.url, locale);
  const active = normalizePath(href) === normalizePath(pagePath) ? " current-menu-item current_page_item" : "";
  const parent = children.length ? " menu-item-has-children elementskit-dropdown-has relative_position elementskit-dropdown-menu-default_width" : "";
  const toggle = children.length ? " ekit-menu-dropdown-toggle" : "";
  const indicator = children.length ? '<i aria-hidden="true" class="icon icon-down-arrow1 elementskit-submenu-indicator"></i>' : "";
  const submenu = children.length
    ? `<ul class="elementskit-dropdown elementskit-submenu-panel">${children
        .map(
          (child) =>
            `<li class="menu-item menu-item-type-custom menu-item-object-custom nav-item elementskit-mobile-builder-content"><a class="dropdown-item" ${linkAttributes(child, locale)}>${escapeHtml(localized(child.label, locale))}</a></li>`,
        )
        .join("")}</ul>`
    : "";

  return `<li class="menu-item menu-item-type-custom menu-item-object-custom nav-item elementskit-mobile-builder-content${parent}${active}"><a class="ekit-menu-nav-link${toggle}" ${linkAttributes(item, locale)}>${escapeHtml(localized(item.label, locale))}${indicator}</a>${submenu}</li>`;
}

function syncNavigation(html: string, settings: CmsNavigationSettings | null | undefined, locale: string, pagePath: string) {
  if (!settings?.items?.length) return html;
  const openingPattern = /<ul\b(?=[^>]*\bclass=(['"])[^'"]*\belementskit-navbar-nav\b[^'"]*\1)[^>]*>/i;
  const opening = openingPattern.exec(html);
  if (!opening) return html;
  const openingEnd = opening.index + opening[0].length;
  const closingStart = matchingClosingTagStart(html, openingEnd, "ul");
  if (closingStart < 0) return html;

  const currentItems = html.slice(openingEnd, closingStart);
  const languageSwitcherAt = currentItems.search(/<li\b[^>]*\bpll-parent-menu-item\b/i);
  const languageSwitcher = languageSwitcherAt >= 0 ? currentItems.slice(languageSwitcherAt) : "";
  const visibleItems = settings.items
    .filter((item) => (locale === "el" ? item.visibleInGreek !== false : item.visibleInEnglish !== false))
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
  const items = visibleItems.map((item) => renderNavigationItem(item, locale, pagePath)).join("");

  return `${html.slice(0, openingEnd)}${items}${languageSwitcher}${html.slice(closingStart)}`;
}

function renderFooterLinks(links: CmsLink[], locale: string) {
  return links
    .map(
      (link) =>
        `<li class="elementor-icon-list-item"><a ${linkAttributes(link, locale)}><span class="elementor-icon-list-text">${escapeHtml(localized(link.label, locale))}</span></a></li>`,
    )
    .join("");
}

function replaceFooterList(html: string, searchFrom: number, links: CmsLink[], locale: string) {
  const openingPattern = /<ul\b(?=[^>]*\bclass=(['"])[^'"]*\belementor-icon-list-items\b[^'"]*\1)[^>]*>/gi;
  openingPattern.lastIndex = searchFrom;
  const opening = openingPattern.exec(html);
  if (!opening) return { html, nextIndex: searchFrom };
  const openingEnd = opening.index + opening[0].length;
  const closingStart = matchingClosingTagStart(html, openingEnd, "ul");
  if (closingStart < 0) return { html, nextIndex: searchFrom };
  const updated = `${html.slice(0, openingEnd)}${renderFooterLinks(links, locale)}${html.slice(closingStart)}`;
  return { html: updated, nextIndex: openingEnd + renderFooterLinks(links, locale).length + 5 };
}

function syncFooter(html: string, settings: CmsFooterSettings | null | undefined, locale: string) {
  const footerStart = html.indexOf("<footer");
  if (footerStart < 0 || !settings) return html;
  let result = { html, nextIndex: footerStart };
  if (settings.serviceLinks) result = replaceFooterList(result.html, result.nextIndex, settings.serviceLinks, locale);
  if (settings.quickLinks) result = replaceFooterList(result.html, result.nextIndex, settings.quickLinks, locale);
  return result.html;
}

function syncLogo(html: string, settings: CmsSiteSettings | null | undefined, locale: string) {
  const logo = locale === "el" ? settings?.greekLogo || settings?.englishLogo : settings?.englishLogo;
  if (!logo) return html;
  return html.replace(
    /(<span\b[^>]*\bprimary-logo\b[^>]*>[\s\S]*?<img\b[^>]*\bsrc=)(['"])[\s\S]*?\2/i,
    (_match, opening: string) => `${opening}"${escapeHtml(logo)}"`,
  );
}

export function syncSiteChromeHtml(
  html: string,
  options: {
    footer?: CmsFooterSettings | null;
    locale: string;
    navigation?: CmsNavigationSettings | null;
    pagePath: string;
    site?: CmsSiteSettings | null;
  },
) {
  return syncLogo(
    syncFooter(syncNavigation(html, options.navigation, options.locale, options.pagePath), options.footer, options.locale),
    options.site,
    options.locale,
  );
}
