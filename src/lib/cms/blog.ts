import { draftMode } from "next/headers";
import { unstable_cache } from "next/cache";
import sanitizeHtml from "sanitize-html";
import { blogPosts as legacyBlogPosts } from "@/src/content/blog";
import { normalizePath } from "@/src/content/route-map";
import { activeLanguages, composeLanguagePath, type CmsLanguageSettings } from "@/src/lib/cms/languages";
import { isMongoConfigured, mongoCollection, tryMongo } from "@/src/lib/mongo";
import type { BlogPost, Locale } from "@/src/types";
import { readLocalCollection } from "./file-store";

type LocalizedString = {
  en?: string;
  el?: string;
};

type CmsBlogPostEntry = {
  title: string;
  language: Locale;
  excerpt?: string;
  existingImagePath?: string;
  featuredImage?: string | null;
  featuredImageAlt?: LocalizedString;
  authorName?: string;
  category?: string;
  categoryName?: string;
  readingTime?: string;
  publishedDate?: string | null;
  draft?: boolean;
  status?: string;
  deletedAt?: Date | string | null;
  bodyHtml?: string;
  bodyMarkdown?: string;
  legacySections?: BlogPost["content"];
  seo?: {
    title?: LocalizedString;
    description?: LocalizedString;
  };
};

export type CmsBlogPathMatch = {
  locale: string;
  slug: string;
};

function localized(value: LocalizedString | undefined, locale: Locale) {
  return value?.[locale] || value?.en || value?.el || "";
}

function shouldReadMongo() {
  const source = process.env.CMS_PUBLIC_SOURCE?.toLowerCase();
  if (source === "local") return false;
  if (source === "mongo") return true;
  return true;
}

export function cmsBlogIndexPathForLocale(locale: string, settings: CmsLanguageSettings) {
  if (locale === "el") return "/el/seo-blog/";
  const language = activeLanguages(settings).find((item) => item.code === locale);
  return normalizePath(composeLanguagePath("/blog/", language || settings.languages[0], settings.defaultLanguage));
}

export function cmsBlogPostPathForLocale(locale: string, slug: string, settings: CmsLanguageSettings) {
  return normalizePath(`${cmsBlogIndexPathForLocale(locale, settings)}${slug}/`);
}

export function parseCmsBlogPath(pathname: string, settings: CmsLanguageSettings): CmsBlogPathMatch | null {
  const normalized = normalizePath(pathname);
  for (const language of activeLanguages(settings)) {
    const indexPath = cmsBlogIndexPathForLocale(language.code, settings);
    if (!normalized.startsWith(indexPath)) continue;
    const slug = normalized.slice(indexPath.length).replace(/\/$/g, "");
    if (slug && !slug.includes("/")) return { locale: language.code, slug };
  }
  return null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const heading = block.match(/^(#{2,4})\s+(.+)$/);
      if (heading) {
        const level = Math.min(heading[1].length, 4);
        return `<h${level}>${escapeHtml(heading[2])}</h${level}>`;
      }
      return `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}

function normalizeBodyHtml(value?: string) {
  const body = value?.trim();
  if (!body) return "";
  const html = /^</.test(body) ? body : markdownToHtml(body);

  return sanitizeHtml(html, {
    allowedTags: [
      "h2",
      "h3",
      "h4",
      "p",
      "br",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}

async function includeDrafts() {
  try {
    const draft = await draftMode();
    return draft.isEnabled;
  } catch {
    return false;
  }
}

async function getLocalCmsBlogPosts(locale: Locale) {
  const entries = await readLocalCollection<CmsBlogPostEntry>("blogPosts");
  const drafts = await includeDrafts();
  return entries
    .filter(({ entry }) => entry.language === locale)
    .filter(({ entry }) => drafts || !entry.draft)
    .map(({ slug, entry }) => toBlogPost(slug, entry));
}

const readCachedMongoBlogList = unstable_cache(
  async (locale: Locale) => {
    if (!isMongoConfigured()) return [];
    const posts = await mongoCollection<CmsBlogPostEntry & { slug?: string }>("blogPosts");
    return posts
      .find(
        {
          language: locale,
          status: "published",
          draft: { $ne: true },
          deletedAt: null,
        },
          {
            projection: {
              title: 1,
              slug: 1,
              language: 1,
              excerpt: 1,
              existingImagePath: 1,
              featuredImage: 1,
              featuredImageAlt: 1,
              authorName: 1,
              categoryName: 1,
              readingTime: 1,
              publishedDate: 1,
              draft: 1,
              seo: 1,
              updatedAt: 1,
            },
          },
      )
      .sort({ publishedDate: -1, updatedAt: -1 })
      .toArray();
  },
  ["cms-blog-list"],
  { tags: ["cms-blog"] },
);

const readCachedMongoBlogPost = unstable_cache(
  async (locale: Locale, slug: string) => {
    if (!isMongoConfigured()) return null;
    const posts = await mongoCollection<CmsBlogPostEntry & { slug?: string }>("blogPosts");
    return posts.findOne({
      language: locale,
      slug,
      status: "published",
      draft: { $ne: true },
      deletedAt: null,
    });
  },
  ["cms-blog-post"],
  { tags: ["cms-blog"] },
);

const readCachedMongoBlogSlugs = unstable_cache(
  async (locale: Locale) => {
    if (!isMongoConfigured()) return [];
    const posts = await mongoCollection<CmsBlogPostEntry & { slug?: string }>("blogPosts");
    const records = await posts
      .find(
        {
          language: locale,
          status: "published",
          draft: { $ne: true },
          deletedAt: null,
        },
        { projection: { slug: 1 } },
      )
      .toArray();
    return records.map((record) => String(record.slug || "")).filter(Boolean);
  },
  ["cms-blog-slugs"],
  { tags: ["cms-blog"] },
);

function toBlogPost(slug: string, entry: CmsBlogPostEntry): BlogPost {
  const bodyHtml = normalizeBodyHtml(entry.bodyHtml || entry.bodyMarkdown);

  return {
    title: entry.title,
    slug,
    locale: entry.language,
    excerpt: entry.excerpt || "",
    image: entry.featuredImage || entry.existingImagePath || "/og.png",
    imageAlt: localized(entry.featuredImageAlt, entry.language) || entry.title,
    category: entry.categoryName || entry.category || "",
    readingTime: entry.readingTime || "",
    publicationDate: entry.publishedDate || "2026-07-14",
    author: entry.authorName || "Pavlina Hörmann",
    bodyHtml,
    content: entry.legacySections?.length ? entry.legacySections : [],
    seoTitle: localized(entry.seo?.title, entry.language) || entry.title,
    metaDescription: localized(entry.seo?.description, entry.language) || entry.excerpt || "",
  };
}

function withFallbackLocale(post: BlogPost, locale: Locale): BlogPost {
  return {
    ...post,
    locale,
  };
}

export async function getCmsBlogPosts(locale: Locale): Promise<BlogPost[]> {
  if (shouldReadMongo() && isMongoConfigured()) {
    const drafts = await includeDrafts();
    const result = await tryMongo(async () =>
      drafts
        ? await (async () => {
          const posts = await mongoCollection<CmsBlogPostEntry & { slug?: string }>("blogPosts");
          return posts
            .find(
              {
                language: locale,
                status: { $ne: "soft_deleted" },
                deletedAt: null,
              },
              {
                projection: {
                  title: 1,
                  slug: 1,
                  language: 1,
                  excerpt: 1,
                  existingImagePath: 1,
                  featuredImage: 1,
                  featuredImageAlt: 1,
                  authorName: 1,
                  categoryName: 1,
                  readingTime: 1,
                  publishedDate: 1,
                  draft: 1,
                  seo: 1,
                  updatedAt: 1,
                },
              },
            )
            .sort({ publishedDate: -1, updatedAt: -1 })
            .toArray();
        })()
        : await readCachedMongoBlogList(locale),
    );
    if (result.ok) {
      return result.value.map((record) => toBlogPost(String(record.slug || ""), record));
    }
  }

  const localPosts = await getLocalCmsBlogPosts(locale);
  if (localPosts.length) return localPosts;
  return legacyBlogPosts[locale];
}

export async function getCmsBlogPost(locale: Locale, slug: string): Promise<BlogPost | null> {
  if (shouldReadMongo() && isMongoConfigured()) {
    const drafts = await includeDrafts();
    const result = await tryMongo(async () =>
      drafts
        ? await (async () => {
          const posts = await mongoCollection<CmsBlogPostEntry & { slug?: string }>("blogPosts");
          return posts.findOne({ language: locale, slug, status: { $ne: "soft_deleted" }, deletedAt: null });
        })()
        : await readCachedMongoBlogPost(locale, slug),
    );
    if (result.ok) return result.value ? toBlogPost(slug, result.value) : null;
  }

  const posts = await getLocalCmsBlogPosts(locale);
  const localPost = posts.find((post) => post.slug === slug) || legacyBlogPosts[locale].find((post) => post.slug === slug) || null;
  if (localPost) return localPost;

  if (locale !== "en") {
    const fallbackPost = await getCmsBlogPost("en", slug);
    return fallbackPost ? withFallbackLocale(fallbackPost, locale) : null;
  }

  return null;
}

export async function getCmsBlogSlugs(locale: Locale): Promise<string[]> {
  if (shouldReadMongo() && isMongoConfigured()) {
    const drafts = await includeDrafts();
    const result = await tryMongo(async () =>
      drafts
        ? await (async () => {
          const posts = await mongoCollection<CmsBlogPostEntry & { slug?: string }>("blogPosts");
          const records = await posts
            .find({ language: locale, status: { $ne: "soft_deleted" }, deletedAt: null }, { projection: { slug: 1 } })
            .toArray();
          return records.map((record) => String(record.slug || "")).filter(Boolean);
        })()
        : await readCachedMongoBlogSlugs(locale),
    );
    if (result.ok) return result.value;
  }

  const cmsPosts = await getLocalCmsBlogPosts(locale);
  const legacySlugs = legacyBlogPosts[locale].map((post) => post.slug);
  const fallbackSlugs = locale === "en" ? [] : await getCmsBlogSlugs("en");
  return Array.from(new Set([...cmsPosts.map((post) => post.slug), ...legacySlugs, ...fallbackSlugs]));
}
