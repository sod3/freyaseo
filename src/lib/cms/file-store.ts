import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const collectionFolders: Record<string, string> = {
  pages: "pages",
  redirects: "redirects",
  blogPosts: "blog-posts",
  services: "services",
  tools: "tools",
  certificates: "certificates",
  faqs: "faqs",
  testimonials: "testimonials",
  mediaAssets: "media-assets",
  tags: "tags",
  categories: "blog-categories",
  authors: "authors",
};

const singletonFiles: Record<string, string> = {
  marketingSettings: "marketing",
  siteSettings: "site-settings",
  navigationSettings: "navigation",
  footerSettings: "footer",
  seoSettings: "seo",
  contactFormSettings: "contact",
};

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const contents = await fs.readFile(filePath, "utf8");
    return JSON.parse(contents) as T;
  } catch {
    return null;
  }
}

function parseMdoc<T>(contents: string): T | null {
  const match = contents.match(/^---\s*([\s\S]*?)\s*---/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]) as T;
  } catch {
    return null;
  }
}

export const readLocalSingleton = cache(async <T>(name: string): Promise<T | null> => {
  const key = singletonFiles[name] || name;
  return readJsonFile<T>(path.join(root, "content", "cms", "settings", `${key}.json`));
});

export const readLocalCollection = cache(async <T>(name: string): Promise<Array<{ slug: string; entry: T }>> => {
  const folder = collectionFolders[name] || name;
  const directory = path.join(root, "content", "cms", folder);

  try {
    const files = await fs.readdir(directory);
    const entries = await Promise.all(
      files
        .filter((file) => file.endsWith(".json") || file.endsWith(".mdoc"))
        .map(async (file) => {
          const fullPath = path.join(directory, file);
          const contents = await fs.readFile(fullPath, "utf8");
          const entry = file.endsWith(".mdoc") ? parseMdoc<T>(contents) : (JSON.parse(contents) as T);
          if (!entry) return null;

          return {
            slug: file.replace(/\.(json|mdoc)$/i, ""),
            entry,
          };
        }),
    );

    return entries.reduce<Array<{ slug: string; entry: T }>>((items, entry) => {
      if (entry) items.push(entry);
      return items;
    }, []);
  } catch {
    return [];
  }
});
