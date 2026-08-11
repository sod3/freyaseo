import type { BlogPost, Locale } from "@/src/types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function replaceAttribute(markup: string, attribute: string, value: string) {
  const pattern = new RegExp(`\\s${attribute}=(['\"])[\\s\\S]*?\\1`, "gi");
  const replacement = ` ${attribute}="${escapeHtml(value)}"`;
  return pattern.test(markup)
    ? markup.replace(pattern, () => replacement)
    : markup.replace(/\s*\/?\>$/, (ending) => `${replacement}${ending}`);
}

function removeAttribute(markup: string, attribute: string) {
  return markup.replace(new RegExp(`\\s${attribute}=(['\"])[\\s\\S]*?\\1`, "gi"), "");
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

function defaultCardTemplate() {
  return '<article class="uagb-post__inner-wrap"><div class="uagb-post__image"><a class="uagb-image-ratio-inherit" href="/" rel="bookmark noopener noreferrer" target="_self"><img alt="" class="attachment-large size-large" decoding="async" loading="lazy" src="/og.png" /></a></div><h2 class="uagb-post__title uagb-post__text"><a href="/" rel="bookmark noopener noreferrer" target="_self"></a></h2><div class="uagb-post__text uagb-post-grid-byline"></div></article>';
}

function renderBlogCard(template: string, post: BlogPost, locale: Locale) {
  const base = locale === "el" ? "/el/seo-blog/" : "/blog/";
  const href = `${base}${encodeURIComponent(post.slug)}/`;
  let card = replaceAttribute(template, "href", href);

  card = card.replace(/<img\b[^>]*>/i, (image) => {
    const withSource = replaceAttribute(image, "src", post.image || "/og.png");
    const withAlt = replaceAttribute(withSource, "alt", post.imageAlt || post.title);
    return removeAttribute(withAlt, "srcset");
  });

  card = card.replace(
    /(<h2\b[^>]*\buagb-post__title\b[^>]*>[\s\S]*?<a\b[^>]*>)[\s\S]*?(<\/a>[\s\S]*?<\/h2>)/i,
    (_match, opening: string, closing: string) => `${opening}${escapeHtml(post.title)}${closing}`,
  );
  return card;
}

/**
 * Replace only the cards inside the existing WordPress/UAGB grid. The outer
 * Elementor markup and every styling class remain untouched.
 */
export function syncBlogIndexHtml(html: string, posts: BlogPost[], locale: Locale) {
  const openingPattern = /<div\b(?=[^>]*\bclass=(['"])[^'"]*\bwp-block-uagb-post-grid\b[^'"]*\1)[^>]*>/i;
  const opening = openingPattern.exec(html);
  if (!opening) return html;

  const openingStart = opening.index;
  const openingEnd = openingStart + opening[0].length;
  const closingStart = matchingClosingTagStart(html, openingEnd, "div");
  if (closingStart < 0) return html;

  const currentCards = html.slice(openingEnd, closingStart);
  const template = currentCards.match(/<article\b[^>]*\buagb-post__inner-wrap\b[^>]*>[\s\S]*?<\/article>/i)?.[0] || defaultCardTemplate();
  const cards = posts
    .filter((post) => post.slug)
    .map((post) => renderBlogCard(template, post, locale))
    .join("");
  const updatedOpening = replaceAttribute(opening[0], "data-total", String(posts.length));

  return `${html.slice(0, openingStart)}${updatedOpening}${cards}${html.slice(closingStart)}`;
}
