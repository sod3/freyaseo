import { unstable_cache } from "next/cache";
import { isMongoConfigured } from "@/src/lib/mongo";
import { readLocalCollection } from "./file-store";
import { readCollection } from "./reader";

type CmsReplacement = {
  from: string;
  to: string;
};

const visualFields: Record<string, Set<string>> = {
  services: new Set(["title", "greekTitle", "shortDescription", "fullDescription", "featuredImage"]),
  tools: new Set([
    "name",
    "englishName",
    "greekName",
    "shortDescription",
    "fullDescription",
    "logo",
    "existingLogoPath",
    "logoAlt",
    "logoTitle",
    "imageCaption",
    "toolUrl",
  ]),
  certificates: new Set(["title", "issuer", "image", "imageAlt", "credentialUrl", "description"]),
  faqs: new Set(["question", "greekQuestion", "answer"]),
  testimonials: new Set(["clientName", "companyName", "role", "quote", "image", "imageAlt"]),
};

function valueAtPath(value: unknown, path: string[]): unknown {
  let current = value;
  for (const part of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function collectStringPaths(value: unknown, path: string[] = []): Array<{ path: string[]; value: string }> {
  if (typeof value === "string") return [{ path, value }];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => collectStringPaths(child, [...path, key]));
}

async function replacementsForCollection(name: string) {
  const [baseline, current] = await Promise.all([
    readLocalCollection<Record<string, unknown>>(name),
    readCollection<Record<string, unknown>>(name),
  ]);
  const currentBySlug = new Map(current.map((item) => [item.slug, item.entry]));
  const allowed = visualFields[name];
  const replacements: CmsReplacement[] = [];

  for (const baselineItem of baseline) {
    const currentEntry = currentBySlug.get(baselineItem.slug);
    if (!currentEntry || currentEntry.active === false || currentEntry.status === "soft_deleted" || currentEntry.deletedAt) continue;
    for (const original of collectStringPaths(baselineItem.entry)) {
      if (!allowed.has(original.path[0] || "") || !original.value) continue;
      const next = valueAtPath(currentEntry, original.path);
      if (typeof next === "string" && next !== original.value) {
        replacements.push({ from: original.value, to: next });
      }
    }
  }

  return replacements;
}

const readCachedCmsContentReplacements = unstable_cache(
  async (source: string) => {
    void source;
    const replacements = await Promise.all(Object.keys(visualFields).map((name) => replacementsForCollection(name)));
    const unique = new Map<string, string>();
    for (const replacement of replacements.flat()) unique.set(replacement.from, replacement.to);
    return Array.from(unique, ([from, to]) => ({ from, to })).sort((left, right) => right.from.length - left.from.length);
  },
  ["cms-content-overlays"],
  { tags: ["cms-content"] },
);

export function getCmsContentReplacements() {
  const source = `${process.env.CMS_PUBLIC_SOURCE || "auto"}:${isMongoConfigured() ? "mongo" : "local"}`;
  return readCachedCmsContentReplacements(source);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function applyCmsContentReplacements(html: string, replacements: CmsReplacement[]) {
  let result = html;
  for (const replacement of replacements) {
    const escapedFrom = escapeHtml(replacement.from);
    const escapedTo = escapeHtml(replacement.to);
    if (escapedFrom !== replacement.from) result = result.split(escapedFrom).join(escapedTo);
    result = result.split(replacement.from).join(escapedTo);
  }
  return result;
}
