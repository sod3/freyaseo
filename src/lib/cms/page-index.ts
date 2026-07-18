import { cache } from "react";
import { unstable_cache } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";
import { documentId, isMongoConfigured, mongoCollection, withMongo } from "@/src/lib/mongo";
import type { CmsRoutablePage } from "./routing";

export type CmsPageRouteEntry = CmsRoutablePage & {
  sourceSlug?: string;
  slug?: string;
};

const root = process.cwd();
const pagesDirectory = path.join(root, "content", "cms", "pages");

function shouldReadMongo() {
  const source = process.env.CMS_PUBLIC_SOURCE?.toLowerCase();
  if (source === "local") return false;
  if (source === "mongo") return true;
  return true;
}

function parseJsonStringLiteral(value?: string) {
  if (!value || value === "null") return undefined;
  try {
    return JSON.parse(value) as string;
  } catch {
    return undefined;
  }
}

function stringField(contents: string, field: string) {
  const match = contents.match(new RegExp(`"${field}"\\s*:\\s*("(?:\\\\.|[^"\\\\])*"|null)`));
  return parseJsonStringLiteral(match?.[1]);
}

function booleanOrDateField(contents: string, field: string) {
  const match = contents.match(new RegExp(`"${field}"\\s*:\\s*(true|false|null|"(?:\\\\.|[^"\\\\])*")`));
  if (!match) return undefined;
  if (match[1] === "true") return true;
  if (match[1] === "false" || match[1] === "null") return undefined;
  return parseJsonStringLiteral(match[1]);
}

export const readLocalPageRouteIndex = cache(async (): Promise<CmsPageRouteEntry[]> => {
  try {
    const files = await fs.readdir(pagesDirectory);
    const entries = await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => {
          const contents = await fs.readFile(path.join(pagesDirectory, file), "utf8");
          const sourceSlug = file.replace(/\.json$/i, "");
          const pathValue = stringField(contents, "path");
          if (!pathValue) return null;

          return {
            sourceSlug,
            slug: stringField(contents, "slug") || sourceSlug,
            path: pathValue,
            locale: stringField(contents, "locale"),
            language: stringField(contents, "language"),
            translationKey: stringField(contents, "translationKey"),
            translationGroup: stringField(contents, "translationGroup"),
            alternatePath: stringField(contents, "alternatePath"),
            status: stringField(contents, "status") || "published",
            deletedAt: booleanOrDateField(contents, "deletedAt"),
          } satisfies CmsPageRouteEntry;
        }),
    );

    return entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  } catch {
    return [];
  }
});

export async function readLocalCmsPageBySourceSlug<T>(sourceSlug: string): Promise<T | null> {
  const safeSlug = sourceSlug.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeSlug) return null;

  try {
    const contents = await fs.readFile(path.join(pagesDirectory, `${safeSlug}.json`), "utf8");
    return JSON.parse(contents) as T;
  } catch {
    return null;
  }
}

const readCachedMongoPageRouteIndex = unstable_cache(
  async () => {
    if (!isMongoConfigured()) return [];
    return withMongo(async () => {
      const pages = await mongoCollection<Record<string, unknown>>("pages");
      const records = await pages
        .find(
          { deletedAt: { $ne: true }, status: { $ne: "soft_deleted" } },
          {
            projection: {
              sourceSlug: 1,
              slug: 1,
              path: 1,
              locale: 1,
              language: 1,
              translationKey: 1,
              translationGroup: 1,
              alternatePath: 1,
              status: 1,
              deletedAt: 1,
            },
          },
        )
        .sort({ locale: 1, path: 1 })
        .toArray();

      return records
        .filter((record) => record.path)
        .map((record) => ({
          sourceSlug: String(record.sourceSlug || record.slug || documentId(record)),
          slug: String(record.slug || record.sourceSlug || documentId(record)),
          path: String(record.path || "/"),
          locale: typeof record.locale === "string" ? record.locale : undefined,
          language: typeof record.language === "string" ? record.language : undefined,
          translationKey: typeof record.translationKey === "string" ? record.translationKey : undefined,
          translationGroup: typeof record.translationGroup === "string" ? record.translationGroup : undefined,
          alternatePath: typeof record.alternatePath === "string" ? record.alternatePath : undefined,
          status: typeof record.status === "string" ? record.status : "published",
          deletedAt: record.deletedAt,
        })) satisfies CmsPageRouteEntry[];
    }, []);
  },
  ["cms-page-route-index"],
  { tags: ["cms-pages"] },
);

export const getCmsPageRouteIndex = cache(async (): Promise<CmsPageRouteEntry[]> => {
  const fallback = await readLocalPageRouteIndex();
  if (!shouldReadMongo()) return fallback;

  const mongoEntries = await readCachedMongoPageRouteIndex();
  return mongoEntries.length ? mongoEntries : fallback;
});
