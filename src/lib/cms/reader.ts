import { cache } from "react";
import { unstable_cache } from "next/cache";
import { documentId, mongoCollection, withMongo } from "@/src/lib/mongo";
import { readLocalCollection, readLocalSingleton } from "./file-store";

const singletonKeys: Record<string, string> = {
  marketingSettings: "marketing",
  siteSettings: "site-settings",
  navigationSettings: "navigation",
  footerSettings: "footer",
  seoSettings: "seo",
  contactFormSettings: "contact",
};

const collectionNames: Record<string, string> = {
  pages: "pages",
  redirects: "redirects",
  blogPosts: "blogPosts",
};

function shouldReadMongo() {
  const source = process.env.CMS_PUBLIC_SOURCE?.toLowerCase();
  if (source === "local") return false;
  if (source === "mongo") return true;
  return true;
}

async function readMongoSingleton<T>(name: string): Promise<T | null> {
  const key = singletonKeys[name] || name;
  const settings = await mongoCollection<{ key: string; value: T }>("settings");
  const setting = await settings.findOne({ key });
  return setting?.value || null;
}

const readCachedMongoSingleton = unstable_cache(
  async (name: string) => readMongoSingleton<unknown>(name),
  ["cms-singleton"],
  { tags: ["cms-settings"] },
);

async function readMongoCollection<T>(name: string): Promise<Array<{ slug: string; entry: T }>> {
  const collectionName = collectionNames[name];
  if (!collectionName) return [];

  const collection = await mongoCollection<Record<string, unknown>>(collectionName);
  const records = await collection
    .find({})
    .sort(name === "pages" ? { navigationOrder: 1, path: 1 } : { updatedAt: -1 })
    .toArray();

  return records.map((record) => ({
    slug: String(record.slug || record.sourceSlug || documentId(record)),
    entry: record as T,
  }));
}

export const readSingleton = cache(async <T>(name: string): Promise<T | null> => {
  const fallback = await readLocalSingleton<T>(name);
  if (!shouldReadMongo()) return fallback;
  return withMongo(async () => ((await readCachedMongoSingleton(name)) as T | null) || fallback, fallback);
});

export const readCollection = cache(async <T>(name: string): Promise<Array<{ slug: string; entry: T }>> => {
  const fallback = await readLocalCollection<T>(name);
  if (!shouldReadMongo()) return fallback;
  return withMongo(async () => {
    const entries = await readMongoCollection<T>(name);
    return entries.length ? entries : fallback;
  }, fallback);
});
