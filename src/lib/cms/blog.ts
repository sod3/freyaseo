import { draftMode } from "next/headers";
import { unstable_cache } from "next/cache";
import sanitizeHtml from "sanitize-html";
import { blogPosts as legacyBlogPosts } from "@/src/content/blog";
import { isMongoConfigured, mongoCollection, withMongo } from "@/src/lib/mongo";
import type { BlogPost, Locale } from "@/src/types";
import { readCollection } from "./reader";

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
  categoryName?: string;
  readingTime?: string;
  publishedDate?: string | null;
  draft?: boolean;
  bodyHtml?: string;
  bodyMarkdown?: string;
  legacySections?: BlogPost["content"];
  seo?: {
    title?: LocalizedString;
    description?: LocalizedString;
  };
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
  const entries = await readCollection<CmsBlogPostEntry>("blogPosts");
  const drafts = await includeDrafts();
  return entries
    .filter(({ entry }) => entry.language === locale)
    .filter(({ entry }) => drafts || !entry.draft)
    .map(({ slug, entry }) => toBlogPost(slug, entry));
}

const readCachedMongoBlogList = unstable_cache(
  async (locale: Locale) => {
    if (!isMongoConfigured()) return [];
    return withMongo(async () => {
      const posts = await mongoCollection<CmsBlogPostEntry & { slug?: string }>("blogPosts");
      return posts
        .find(
          {
            language: locale,
            draft: { $ne: true },
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
    }, []);
  },
  ["cms-blog-list"],
  { tags: ["cms-blog"] },
);

const readCachedMongoBlogPost = unstable_cache(
  async (locale: Locale, slug: string) => {
    if (!isMongoConfigured()) return null;
    return withMongo(async () => {
      const posts = await mongoCollection<CmsBlogPostEntry & { slug?: string }>("blogPosts");
      return posts.findOne({
        language: locale,
        slug,
        draft: { $ne: true },
      });
    }, null);
  },
  ["cms-blog-post"],
  { tags: ["cms-blog"] },
);

const readCachedMongoBlogSlugs = unstable_cache(
  async (locale: Locale) => {
    if (!isMongoConfigured()) return [];
    return withMongo(async () => {
      const posts = await mongoCollection<{ slug?: string; language: Locale; draft?: boolean }>("blogPosts");
      const records = await posts
        .find(
          {
            language: locale,
            draft: { $ne: true },
          },
          { projection: { slug: 1 } },
        )
        .toArray();
      return records.map((record) => String(record.slug || "")).filter(Boolean);
    }, []);
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
    category: entry.categoryName || "",
    readingTime: entry.readingTime || "",
    publicationDate: entry.publishedDate || "2026-07-14",
    author: entry.authorName || "Pavlina Hörmann",
    bodyHtml,
    content: entry.legacySections?.length ? entry.legacySections : [],
    seoTitle: localized(entry.seo?.title, entry.language) || entry.title,
    metaDescription: localized(entry.seo?.description, entry.language) || entry.excerpt || "",
  };
}

export async function getCmsBlogPosts(locale: Locale) {
  if (shouldReadMongo() && isMongoConfigured()) {
    const drafts = await includeDrafts();
    const records = drafts
      ? await withMongo(async () => {
          const posts = await mongoCollection<CmsBlogPostEntry & { slug?: string }>("blogPosts");
          return posts
            .find(
              {
                language: locale,
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
        }, [])
      : await readCachedMongoBlogList(locale);
    const cmsPosts = records.map((record) => toBlogPost(String(record.slug || ""), record));
    if (cmsPosts.length) return cmsPosts;
  }

  const localPosts = await getLocalCmsBlogPosts(locale);
  if (localPosts.length) return localPosts;
  return legacyBlogPosts[locale];
}

export async function getCmsBlogPost(locale: Locale, slug: string) {
  if (shouldReadMongo() && isMongoConfigured()) {
    const drafts = await includeDrafts();
    const record = drafts
      ? await withMongo(async () => {
          const posts = await mongoCollection<CmsBlogPostEntry & { slug?: string }>("blogPosts");
          return posts.findOne({ language: locale, slug });
        }, null)
      : await readCachedMongoBlogPost(locale, slug);
    const post = record ? toBlogPost(slug, record) : null;
    if (post) return post;
  }

  const posts = await getLocalCmsBlogPosts(locale);
  return posts.find((post) => post.slug === slug) || legacyBlogPosts[locale].find((post) => post.slug === slug) || null;
}

export async function getCmsBlogSlugs(locale: Locale) {
  if (shouldReadMongo() && isMongoConfigured()) {
    const drafts = await includeDrafts();
    const mongoSlugs = drafts
      ? await withMongo(async () => {
          const posts = await mongoCollection<{ slug?: string; language: Locale; draft?: boolean }>("blogPosts");
          const records = await posts.find({ language: locale }, { projection: { slug: 1 } }).toArray();
          return records.map((record) => String(record.slug || "")).filter(Boolean);
        }, [])
      : await readCachedMongoBlogSlugs(locale);
    if (mongoSlugs.length) {
      const legacySlugs = legacyBlogPosts[locale].map((post) => post.slug);
      return Array.from(new Set([...mongoSlugs, ...legacySlugs]));
    }
  }

  const cmsPosts = await getLocalCmsBlogPosts(locale);
  const legacySlugs = legacyBlogPosts[locale].map((post) => post.slug);
  return Array.from(new Set([...cmsPosts.map((post) => post.slug), ...legacySlugs]));
}
