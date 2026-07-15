import "dotenv/config";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { MongoClient } from "mongodb";

const root = process.cwd();
const cmsRoot = path.join(root, "content", "cms");
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "freyaseo";

if (!uri) {
  console.error("MONGODB_URI is required for the custom CMS seed.");
  process.exit(1);
}

const report = {
  users: 0,
  roles: 0,
  settings: 0,
  pages: 0,
  blogPosts: 0,
  services: 0,
  tools: 0,
  certificates: 0,
  faqs: 0,
  mediaAssets: 0,
  redirects: 0,
  tags: 0,
  categories: 0,
  forms: 0,
};

function contentPath(...segments) {
  return path.join(cmsRoot, ...segments);
}

async function readJson(filePath) {
  const contents = await fs.readFile(filePath, "utf8");
  return JSON.parse(contents);
}

async function readFolder(folder, extension = ".json") {
  const directory = contentPath(folder);
  try {
    const files = (await fs.readdir(directory)).filter((file) => file.endsWith(extension)).sort();
    return Promise.all(
      files.map(async (file) => ({
        slug: file.slice(0, -extension.length),
        data: await readJson(path.join(directory, file)),
      })),
    );
  } catch {
    return [];
  }
}

async function readMdocFolder(folder) {
  const directory = contentPath(folder);
  try {
    const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".mdoc")).sort();
    return Promise.all(
      files.map(async (file) => {
        const contents = await fs.readFile(path.join(directory, file), "utf8");
        const match = contents.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
        if (!match) throw new Error(`Invalid mdoc frontmatter: ${file}`);
        return {
          slug: file.slice(0, -".mdoc".length),
          data: JSON.parse(match[1]),
          markdown: match[2].trim(),
        };
      }),
    );
  } catch {
    return [];
  }
}

function slugify(value, fallback = "item") {
  const ascii = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (ascii || fallback).slice(0, 90);
}

function slugFromPath(pathname, fallback) {
  const clean = String(pathname || "")
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+|\/+$/g, "");
  return clean ? slugify(clean.replace(/\//g, "-"), fallback) : fallback;
}

function mimeFromUrl(url) {
  const ext = path.extname(url.split("?")[0] || "").toLowerCase();
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}

function hashId(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 10);
}

function both(en = "", el = "") {
  return { en, el };
}

async function upsert(collection, filter, data) {
  const now = new Date();
  await collection.updateOne(
    filter,
    {
      $set: {
        ...data,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("pages").createIndex({ locale: 1, path: 1 }, { unique: true }),
    db.collection("pages").createIndex({ path: 1 }),
    db.collection("pages").createIndex({ updatedAt: -1 }),
    db.collection("pages").createIndex({ locale: 1, slug: 1 }),
    db.collection("blogPosts").createIndex({ language: 1, slug: 1 }, { unique: true }),
    db.collection("blogPosts").createIndex({ language: 1, draft: 1, publishedDate: -1, updatedAt: -1 }),
    db.collection("mediaAssets").createIndex({ url: 1 }, { unique: true }),
    db.collection("mediaAssets").createIndex({ updatedAt: -1 }),
    db.collection("redirects").createIndex({ sourceUrl: 1 }, { unique: true }),
    db.collection("redirects").createIndex({ sourceUrl: 1, active: 1 }),
    db.collection("settings").createIndex({ key: 1 }, { unique: true }),
    db.collection("auditLogs").createIndex({ createdAt: -1 }),
    db.collection("formSubmissions").createIndex({ formKey: 1, createdAt: -1 }),
  ]);
}

async function seedRolesAndAdmin(db) {
  const roles = db.collection("roles");
  const roleDefinitions = [
    ["SUPER_ADMIN", "Super Administrator", ["*"]],
    [
      "ADMINISTRATOR",
      "Administrator",
      ["dashboard.view", "content.read", "content.write", "content.publish", "media.write", "seo.write", "forms.read"],
    ],
    ["EDITOR", "Editor", ["dashboard.view", "content.read", "content.write", "media.write"]],
    ["VIEWER", "Viewer", ["dashboard.view", "content.read", "forms.read"]],
  ];

  for (const [key, name, permissions] of roleDefinitions) {
    await upsert(roles, { key }, { key, name, permissions });
    report.roles += 1;
  }

  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) return;

  const users = db.collection("users");
  const existing = await users.findOne({ email: email.toLowerCase() });
  if (!existing) {
    await users.insertOne({
      email: email.toLowerCase(),
      name: "Initial Administrator",
      passwordHash: await bcrypt.hash(password, 12),
      status: "MUST_CHANGE_PASSWORD",
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
      roles: ["SUPER_ADMIN"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    report.users += 1;
  }
}

async function seedSettings(db) {
  const settings = db.collection("settings");
  const files = await readFolder("settings");
  for (const { slug, data } of files) {
    await upsert(settings, { key: slug }, { key: slug, value: data });
    report.settings += 1;
  }

  const contact = files.find((item) => item.slug === "contact")?.data;
  if (contact) {
    await upsert(db.collection("forms"), { key: "contact" }, {
      key: "contact",
      title: contact.title || both("Contact", "Contact"),
      description: contact.description || both("", ""),
      fields: contact.fields || [],
      submitLabel: contact.submitButtonText || both("Submit", "Submit"),
      successMessage: contact.successMessage || both("", ""),
      errorMessage: contact.errorMessage || both("", ""),
      consentText: contact.consentCheckboxText || both("", ""),
      privacyUrl: contact.privacyPolicyLink || "",
      recipientEmail: contact.recipientEmail || "",
      active: true,
    });
    report.forms += 1;
  }
}

async function seedMedia(db) {
  const collection = db.collection("mediaAssets");
  const mediaAssets = await readFolder("media-assets");
  for (const { data } of mediaAssets) {
    const metadata = data.metadata || {};
    const url = metadata.externalSourceUrl || metadata.image || "";
    if (!url) continue;
    await upsert(collection, { url }, {
      sourceSlug: slugify(metadata.title || data.title || `media-${hashId(url)}`),
      fileName: path.basename(url.split("?")[0]) || `media-${hashId(url)}`,
      originalFileName: path.basename(url.split("?")[0]) || `media-${hashId(url)}`,
      title: metadata.title || data.title || "",
      url,
      storageDriver: "EXTERNAL",
      mimeType: metadata.fileType ? mimeFromUrl(`file.${metadata.fileType}`) : mimeFromUrl(url),
      fileSize: metadata.fileSize || null,
      width: metadata.width || null,
      height: metadata.height || null,
      alt: metadata.alt || both("", ""),
      caption: metadata.caption || both("", ""),
      description: metadata.description || both("", ""),
      credit: metadata.credit || "",
      copyright: metadata.copyright || "",
      decorative: Boolean(metadata.decorative),
      tagsText: metadata.tags || [],
    });
    report.mediaAssets += 1;
  }
}

async function seedTaxonomy(db) {
  const categories = db.collection("categories");
  const tags = db.collection("tags");
  const blogCategories = await readFolder("blog-categories");
  for (const { slug, data } of blogCategories) {
    await upsert(categories, { slug, type: "BLOG" }, {
      slug,
      type: "BLOG",
      name: both(data.name || slug, data.greekName || data.name || slug),
      description: data.description || both("", ""),
      indexArchive: Boolean(data.indexArchive),
      active: true,
    });
    report.categories += 1;
  }

  for (const { slug, data } of await readFolder("tags")) {
    await upsert(tags, { slug, type: "BLOG" }, {
      slug,
      type: "BLOG",
      name: both(data.name || slug, data.greekName || data.name || slug),
      description: data.description || both("", ""),
      indexArchive: Boolean(data.indexArchive),
      active: true,
    });
    report.tags += 1;
  }

  for (const { slug, data } of await readFolder("tool-categories")) {
    await upsert(categories, { slug, type: "TOOL" }, {
      slug,
      type: "TOOL",
      name: both(data.name || slug, data.greekName || data.name || slug),
      description: data.description || both("", ""),
      active: data.active !== false,
    });
  }
}

async function seedPages(db) {
  const pages = db.collection("pages");
  for (const { slug, data } of await readFolder("pages")) {
    const locale = data.locale || (data.path?.startsWith("/el/") ? "el" : "en");
    await upsert(pages, { locale, path: data.path }, {
      ...data,
      sourceSlug: slug,
      slug: slugFromPath(data.path, slug),
      locale,
      status: data.status || "published",
      translationKey: data.translationKey || slug.replace(/^(en|el)_/, ""),
    });
    report.pages += 1;
  }
}

async function seedBlogPosts(db) {
  const posts = db.collection("blogPosts");
  for (const { slug, data, markdown } of await readMdocFolder("blog-posts")) {
    const language = data.language || "en";
    await upsert(posts, { language, slug }, {
      ...data,
      sourceSlug: slug,
      slug,
      language,
      status: data.draft ? "draft" : "published",
      bodyMarkdown: markdown,
    });
    report.blogPosts += 1;
  }
}

async function seedSimpleCollections(db) {
  const collectionMap = [
    ["services", "services"],
    ["tools", "tools"],
    ["certificates", "certificates"],
    ["faqs", "faqs"],
    ["authors", "authors"],
    ["redirects", "redirects"],
  ];

  for (const [folder, collectionName] of collectionMap) {
    const collection = db.collection(collectionName);
    for (const { slug, data } of await readFolder(folder)) {
      const filter =
        collectionName === "redirects" && data.sourceUrl
          ? { sourceUrl: data.sourceUrl }
          : collectionName === "faqs"
            ? { sourceSlug: slug }
            : { slug };
      await upsert(collection, filter, {
        ...data,
        slug: data.slug || slug,
        sourceSlug: slug,
        active: data.active !== false,
      });
      if (collectionName === "services") report.services += 1;
      if (collectionName === "tools") report.tools += 1;
      if (collectionName === "certificates") report.certificates += 1;
      if (collectionName === "faqs") report.faqs += 1;
      if (collectionName === "redirects") report.redirects += 1;
    }
  }
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  try {
    await ensureIndexes(db);
    await seedRolesAndAdmin(db);
    await seedSettings(db);
    await seedMedia(db);
    await seedTaxonomy(db);
    await seedPages(db);
    await seedBlogPosts(db);
    await seedSimpleCollections(db);

    await db.collection("auditLogs").insertOne({
      action: "content.seed",
      entityType: "system",
      entityName: "Custom CMS MongoDB seed",
      details: report,
      createdAt: new Date(),
    });

    console.log("Custom CMS MongoDB seed complete:");
    for (const [key, value] of Object.entries(report)) {
      console.log(`- ${key}: ${value}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
