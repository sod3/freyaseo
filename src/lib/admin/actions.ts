"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import type { Document, Filter } from "mongodb";
import { documentId, idFilter, isMongoConfigured, mongoCollection } from "@/src/lib/mongo";
import { saveUpload } from "@/src/lib/storage";
import {
  can,
  createSession,
  getCurrentAdminUser,
  getRequestMeta,
  hashPassword,
  requireAdminUser,
  revokeCurrentSession,
  verifyCsrfToken,
  verifyPassword,
} from "./auth";
import {
  collectionModuleNames,
  defaultJsonForModule,
  getModuleStorage,
  revalidationPathsForModule,
  writePermissionForModule,
} from "./module-config";
import type { AdminModuleSlug } from "./modules";

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
  rememberMe: z.boolean(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
  confirmPassword: z.string().min(12),
});

const recordSchema = z.object({
  module: z.string(),
  id: z.string().optional(),
  title: z.string().min(1).max(220),
  description: z.string().optional(),
  status: z.string().optional(),
  language: z.enum(["en", "el"]).optional(),
  path: z.string().optional(),
  slug: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  featuredImage: z.string().optional(),
  featuredImageAlt: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  canonicalUrl: z.string().optional(),
  bodyHtml: z.string().optional(),
  pageHtml: z.string().optional(),
  renderMode: z.enum(["wordpressHtml", "structuredBlocks"]).optional(),
  sectionsJson: z.string().optional(),
  contentEditsJson: z.string().optional(),
  createRedirect: z.boolean().optional(),
});

const jsonRecordSchema = z.object({
  module: z.string(),
  id: z.string().optional(),
  jsonData: z.string().min(2),
});

function formBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function cmsStatus(status?: string | null) {
  const normalized = String(status || "published").toLowerCase();
  if (normalized.includes("draft")) return "draft";
  if (normalized.includes("review")) return "in_review";
  if (normalized.includes("schedule")) return "scheduled";
  if (normalized.includes("hidden")) return "hidden";
  if (normalized.includes("archive")) return "archived";
  if (normalized.includes("unpublish")) return "unpublished";
  return "published";
}

function slugify(value: string, fallback = "draft") {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function cleanEditorHtml(value?: string) {
  return sanitizeHtml(value || "", {
    allowedTags: [
      "h1",
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

function parseSectionsJson(value?: string, fallback: unknown = []) {
  const raw = value?.trim();
  if (!raw) return fallback;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Sections must be a JSON array.");
  return parsed;
}

function parseTags(value?: string | null) {
  return Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function escapeHtmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function replaceAttribute(markup: string, attribute: string, value: string) {
  const escaped = escapeHtmlText(value);
  const pattern = new RegExp(`\\s${attribute}=(["']).*?\\1`, "i");
  if (pattern.test(markup)) return markup.replace(pattern, ` ${attribute}="${escaped}"`);
  const end = markup.endsWith("/>") ? markup.length - 2 : markup.length - 1;
  return `${markup.slice(0, end)} ${attribute}="${escaped}"${markup.slice(end)}`;
}

function replaceOnce(source: string, search: string, replacement: string) {
  const index = source.indexOf(search);
  if (index < 0) return source;
  return `${source.slice(0, index)}${replacement}${source.slice(index + search.length)}`;
}

function replaceAttributeValueOnce(source: string, attribute: string, currentValue: string, nextValue: string) {
  if (!currentValue || currentValue === nextValue) return source;
  const escapedCurrent = escapeHtmlText(currentValue);
  const escapedNext = escapeHtmlText(nextValue);
  const quotedPattern = new RegExp(`(${attribute}=(["']))${escapedCurrent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\2)`, "i");
  if (quotedPattern.test(source)) return source.replace(quotedPattern, `$1${escapedNext}$3`);
  return replaceOnce(source, currentValue, nextValue);
}

function applyVisualContentEdits(html: string, payload?: string) {
  const raw = payload?.trim();
  if (!raw) return html;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return html;
  }

  const edits = parsed as {
    texts?: Array<{ tag?: string; text?: string; originalText?: string; href?: string; originalHref?: string; outerHtml?: string }>;
    images?: Array<{ src?: string; originalSrc?: string; alt?: string; originalAlt?: string; outerHtml?: string }>;
  };
  let nextHtml = html;

  for (const edit of edits.texts || []) {
    const tag = String(edit.tag || "").toLowerCase();
    const outerHtml = edit.outerHtml || "";
    if (!tag || !outerHtml) continue;
    if (!nextHtml.includes(outerHtml)) {
      const originalText = String(edit.originalText || "");
      const nextText = escapeHtmlText(String(edit.text || "")).replace(/\r?\n/g, "<br />");
      if (originalText && originalText !== edit.text) {
        const escapedOriginal = escapeHtmlText(originalText);
        nextHtml = nextHtml.includes(escapedOriginal) ? replaceOnce(nextHtml, escapedOriginal, nextText) : replaceOnce(nextHtml, originalText, nextText);
      }
      if (tag === "a" && typeof edit.href === "string" && edit.originalHref) {
        nextHtml = replaceAttributeValueOnce(nextHtml, "href", edit.originalHref, edit.href);
      }
      continue;
    }
    const closeTag = `</${tag}>`;
    const openEnd = outerHtml.indexOf(">");
    const closeStart = outerHtml.toLowerCase().lastIndexOf(closeTag);
    if (openEnd < 0 || closeStart < 0) continue;

    const nextText = escapeHtmlText(String(edit.text || "")).replace(/\r?\n/g, "<br />");
    let replacement = `${outerHtml.slice(0, openEnd + 1)}${nextText}${outerHtml.slice(closeStart)}`;
    if (tag === "a" && typeof edit.href === "string") {
      const openTag = replacement.slice(0, replacement.indexOf(">") + 1);
      replacement = `${replaceAttribute(openTag, "href", edit.href)}${replacement.slice(replacement.indexOf(">") + 1)}`;
    }
    nextHtml = replaceOnce(nextHtml, outerHtml, replacement);
  }

  for (const edit of edits.images || []) {
    const outerHtml = edit.outerHtml || "";
    if (!outerHtml) continue;
    if (!nextHtml.includes(outerHtml)) {
      if (typeof edit.src === "string" && edit.originalSrc) nextHtml = replaceAttributeValueOnce(nextHtml, "src", edit.originalSrc, edit.src);
      if (typeof edit.alt === "string" && edit.originalAlt) nextHtml = replaceAttributeValueOnce(nextHtml, "alt", edit.originalAlt, edit.alt);
      continue;
    }
    let replacement = outerHtml;
    if (typeof edit.src === "string") replacement = replaceAttribute(replacement, "src", edit.src);
    if (typeof edit.alt === "string") replacement = replaceAttribute(replacement, "alt", edit.alt);
    nextHtml = replaceOnce(nextHtml, outerHtml, replacement);
  }

  return nextHtml;
}

function parseEditableJson(value: string) {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Record JSON must be an object.");
  }
  const record = parsed as Record<string, unknown>;
  delete record._id;
  delete record.id;
  delete record.createdAt;
  delete record.updatedAt;
  return record;
}

function safeAdminRedirect(path: string): never {
  redirect(path.startsWith("/admin") ? path : "/admin/dashboard");
}

function byId(id: string): Filter<Document> {
  return idFilter(id);
}

function revalidateCmsTags(...tags: string[]) {
  Array.from(new Set(tags)).forEach((tag) => revalidateTag(tag, "max"));
}

function cacheTagsForModule(module: AdminModuleSlug) {
  if (module === "redirects") return ["cms-redirects"];
  if (module === "blog") return ["cms-blog"];
  if (module === "navigation" || module === "footer" || module === "seo" || module === "google-integrations" || module === "settings" || module === "forms") {
    return ["cms-settings", "cms-pages"];
  }
  return ["cms-pages", "cms-blog"];
}

async function audit(action: string, entityType: string, entityId?: string | null, entityName?: string | null, details?: unknown) {
  if (!isMongoConfigured()) return;
  const user = await getCurrentAdminUser();
  const meta = await getRequestMeta();
  const auditLogs = await mongoCollection("auditLogs");
  await auditLogs.insertOne({
    userId: user?.id || null,
    action,
    entityType,
    entityId: entityId || null,
    entityName: entityName || null,
    details: details || {},
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    createdAt: new Date(),
  });
}

export async function loginAction(formData: FormData) {
  if (!(await verifyCsrfToken(formData.get("csrfToken")))) safeAdminRedirect("/admin/login?error=session");
  if (!isMongoConfigured()) safeAdminRedirect("/admin/login?error=database");

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    rememberMe: formBoolean(formData, "rememberMe"),
  });
  if (!parsed.success) safeAdminRedirect("/admin/login?error=invalid");

  const { email, password, rememberMe } = parsed.data;
  const meta = await getRequestMeta();
  const loginAttempts = await mongoCollection("loginAttempts");
  const users = await mongoCollection<Record<string, unknown>>("users");
  const recentWindow = new Date(Date.now() - 15 * 60 * 1000);
  const recentFailures = await loginAttempts.countDocuments({ email, success: false, createdAt: { $gte: recentWindow } });
  if (recentFailures >= 8) {
    await loginAttempts.insertOne({ email, ipAddress: meta.ipAddress, success: false, reason: "rate_limited", createdAt: new Date() });
    safeAdminRedirect("/admin/login?error=locked");
  }

  const user = await users.findOne({ email });
  const passwordHash = String(user?.passwordHash || "");
  const passwordMatches = user ? await verifyPassword(password, passwordHash) : false;
  const lockedUntil = user?.lockedUntil instanceof Date ? user.lockedUntil : null;
  const locked = Boolean(lockedUntil && lockedUntil > new Date());

  if (!user || !passwordMatches || locked || user.status === "DISABLED") {
    await loginAttempts.insertOne({
      email,
      ipAddress: meta.ipAddress,
      success: false,
      reason: locked ? "locked" : "invalid_credentials",
      createdAt: new Date(),
    });
    if (user) {
      const nextFailures = Number(user.failedLoginCount || 0) + 1;
      await users.updateOne(byId(documentId(user)), {
        $set: {
          failedLoginCount: nextFailures,
          lockedUntil: nextFailures >= 8 ? new Date(Date.now() + 15 * 60 * 1000) : lockedUntil,
          status: nextFailures >= 8 ? "LOCKED" : user.status,
          updatedAt: new Date(),
        },
      });
    }
    await audit("login.failed", "user", user ? documentId(user) : null, email);
    safeAdminRedirect(locked ? "/admin/login?error=locked" : "/admin/login?error=invalid");
  }

  await loginAttempts.insertOne({ email, ipAddress: meta.ipAddress, success: true, createdAt: new Date() });
  await users.updateOne(byId(documentId(user)), {
    $set: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      status: user.mustChangePassword ? "MUST_CHANGE_PASSWORD" : "ACTIVE",
      updatedAt: new Date(),
    },
  });
  await createSession(documentId(user), rememberMe);
  await audit("login.success", "user", documentId(user), String(user.email || email));
  safeAdminRedirect(user.mustChangePassword ? "/admin/settings?notice=change-password" : "/admin/dashboard");
}

export async function logoutAction() {
  await audit("logout", "session");
  await revokeCurrentSession();
  safeAdminRedirect("/admin/login?notice=logged-out");
}

export async function changePasswordAction(formData: FormData) {
  if (!(await verifyCsrfToken(formData.get("csrfToken")))) safeAdminRedirect("/admin/settings?error=session");
  const user = await requireAdminUser("dashboard.view");
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success || parsed.data.newPassword !== parsed.data.confirmPassword) {
    safeAdminRedirect("/admin/settings?error=password");
  }

  const users = await mongoCollection<Record<string, unknown>>("users");
  const dbUser = await users.findOne(byId(user.id));
  if (!dbUser || !(await verifyPassword(parsed.data.currentPassword, String(dbUser.passwordHash || "")))) {
    safeAdminRedirect("/admin/settings?error=password");
  }

  await users.updateOne(byId(user.id), {
    $set: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
      status: "ACTIVE",
      updatedAt: new Date(),
    },
  });
  await audit("password.changed", "user", user.id, user.email);
  safeAdminRedirect("/admin/settings?notice=password-updated");
}

async function updatePageRecord(data: z.infer<typeof recordSchema>) {
  const pages = await mongoCollection<Record<string, unknown>>("pages");
  const current = await pages.findOne(byId(data.id || ""));
  if (!current) throw new Error("Page not found.");
  const nextPath = data.path || String(current.path || "");
  const now = new Date();
  const locale = String(current.locale || data.language || "en");
  const previousSeoTitle = typeof (typeof current.seo === "object" && current.seo ? (current.seo as Record<string, unknown>).title : null) === "object"
    ? (((current.seo as Record<string, unknown>).title as Record<string, unknown>) || {})
    : {};
  const previousSeoDescription =
    typeof (typeof current.seo === "object" && current.seo ? (current.seo as Record<string, unknown>).description : null) === "object"
      ? (((current.seo as Record<string, unknown>).description as Record<string, unknown>) || {})
      : {};
  const previousOpenGraphImageAlt =
    typeof (typeof current.seo === "object" && current.seo ? (current.seo as Record<string, unknown>).openGraphImageAlt : null) === "object"
      ? (((current.seo as Record<string, unknown>).openGraphImageAlt as Record<string, unknown>) || {})
      : {};
  const nextSeo = {
    ...(typeof current.seo === "object" && current.seo ? current.seo : {}),
    title: { ...previousSeoTitle, [locale]: data.seoTitle || data.title },
    description: { ...previousSeoDescription, [locale]: data.seoDescription || data.description || "" },
    canonicalUrl: data.canonicalUrl || nextPath,
    openGraphImage: data.featuredImage || (typeof current.seo === "object" && current.seo ? (current.seo as Record<string, unknown>).openGraphImage : ""),
    openGraphImageAlt: { ...previousOpenGraphImageAlt, [locale]: data.featuredImageAlt || data.title },
  };
  const sections = parseSectionsJson(data.sectionsJson, current.sections);
  const nextHtml = applyVisualContentEdits(data.pageHtml ?? String(current.html || ""), data.contentEditsJson);

  await pages.updateOne(byId(documentId(current)), {
    $set: {
      title: data.title,
      description: data.description || "",
      status: cmsStatus(data.status),
      path: nextPath,
      slug: data.slug || current.slug,
      category: data.category || current.category || "",
      tags: parseTags(data.tags),
      html: nextHtml,
      renderMode: data.renderMode || current.renderMode || "wordpressHtml",
      sections,
      seo: nextSeo,
      updatedAt: now,
    },
  });

  if (data.createRedirect && nextPath !== current.path) {
    const redirects = await mongoCollection("redirects");
    await redirects.updateOne(
      { sourceUrl: current.path },
      {
        $set: {
          destinationUrl: nextPath,
          permanent: true,
          active: true,
          notes: "Created automatically after an admin URL change.",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  const revisions = await mongoCollection("pageRevisions");
  await revisions.insertOne({
    pageId: documentId(current),
    action: "admin_update",
    previousValue: current,
    newValue: {
      title: data.title,
      description: data.description || "",
      status: cmsStatus(data.status),
      path: nextPath,
      renderMode: data.renderMode || current.renderMode || "wordpressHtml",
    },
    createdAt: now,
  });

  return { id: documentId(current), title: data.title, path: nextPath };
}

async function createPageRecord(data: z.infer<typeof recordSchema>) {
  const pages = await mongoCollection<Record<string, unknown>>("pages");
  const locale = data.language || "en";
  const slug = slugify(data.slug || data.title, `page-${Date.now()}`);
  const path = data.path || (locale === "el" ? `/el/${slug}/` : `/${slug}/`);
  const now = new Date();
  const result = await pages.insertOne({
    sourceSlug: slug,
    title: data.title,
    description: data.description || "",
    path,
    locale,
    status: cmsStatus(data.status || "draft"),
    category: data.category || "",
    tags: parseTags(data.tags),
    alternatePath: "",
    bodyClass: "",
    html: data.pageHtml || "",
    renderMode: data.renderMode || "structuredBlocks",
    sections: parseSectionsJson(data.sectionsJson, [
      {
        discriminant: "hero",
        value: {
          enabled: true,
          heading: { [locale]: data.title },
          content: { [locale]: data.description || "" },
        },
      },
    ]),
      seo: {
        title: { [locale]: data.seoTitle || data.title },
        description: { [locale]: data.seoDescription || data.description || "" },
        canonicalUrl: data.canonicalUrl || path,
        openGraphImage: data.featuredImage || "",
        openGraphImageAlt: { [locale]: data.featuredImageAlt || data.title },
        robotsIndex: true,
        robotsFollow: true,
      schemaType: "WebPage",
    },
    createdAt: now,
    updatedAt: now,
  });
  return { id: result.insertedId.toHexString(), title: data.title, path };
}

async function updateBlogRecord(data: z.infer<typeof recordSchema>) {
  const posts = await mongoCollection<Record<string, unknown>>("blogPosts");
  const current = await posts.findOne(byId(data.id || ""));
  if (!current) throw new Error("Blog post not found.");
  const locale = String(current.language || current.locale || data.language || "en");
  const slug = data.slug || String(current.slug || "");
  const now = new Date();
  const canonical = data.canonicalUrl || (locale === "el" ? `/el/seo-blog/${slug}/` : `/blog/${slug}/`);
  const bodyHtml = cleanEditorHtml(data.bodyHtml ?? String(current.bodyHtml || current.bodyMarkdown || ""));
  const previousSeoTitle = typeof (typeof current.seo === "object" && current.seo ? (current.seo as Record<string, unknown>).title : null) === "object"
    ? (((current.seo as Record<string, unknown>).title as Record<string, unknown>) || {})
    : {};
  const previousSeoDescription =
    typeof (typeof current.seo === "object" && current.seo ? (current.seo as Record<string, unknown>).description : null) === "object"
      ? (((current.seo as Record<string, unknown>).description as Record<string, unknown>) || {})
      : {};
  await posts.updateOne(byId(documentId(current)), {
    $set: {
      title: data.title,
      excerpt: data.description || "",
      bodyHtml,
      bodyMarkdown: "",
      legacySections: [],
      status: cmsStatus(data.status),
      draft: cmsStatus(data.status) !== "published",
      slug,
      category: data.category || current.category || "",
      tags: parseTags(data.tags),
      featuredImage: data.featuredImage || current.featuredImage || current.existingImagePath || "",
      featuredImageAlt: { [locale]: data.featuredImageAlt || data.title },
      seo: {
        ...(typeof current.seo === "object" && current.seo ? current.seo : {}),
        title: { ...previousSeoTitle, [locale]: data.seoTitle || data.title },
        description: { ...previousSeoDescription, [locale]: data.seoDescription || data.description || "" },
        canonicalUrl: canonical,
      },
      updatedAt: now,
    },
  });
  await (await mongoCollection("blogRevisions")).insertOne({
    blogPostId: documentId(current),
    action: "admin_update",
    previousValue: current,
    newValue: { title: data.title, excerpt: data.description || "", status: cmsStatus(data.status), slug },
    createdAt: now,
  });
  return { id: documentId(current), title: data.title, slug, locale };
}

async function createBlogRecord(data: z.infer<typeof recordSchema>) {
  const posts = await mongoCollection<Record<string, unknown>>("blogPosts");
  const locale = data.language || "en";
  const slug = slugify(data.slug || data.title, `post-${Date.now()}`);
  const now = new Date();
  const canonical = data.canonicalUrl || (locale === "el" ? `/el/seo-blog/${slug}/` : `/blog/${slug}/`);
  const result = await posts.insertOne({
    slug,
    title: data.title,
    language: locale,
    excerpt: data.description || "",
    bodyHtml: cleanEditorHtml(data.bodyHtml || ""),
    bodyMarkdown: "",
    legacySections: [],
    status: cmsStatus(data.status || "draft"),
    draft: true,
    publishedDate: null,
    readingTime: "",
    category: data.category || "",
    tags: parseTags(data.tags),
    featuredImage: data.featuredImage || "",
    featuredImageAlt: { [locale]: data.featuredImageAlt || data.title },
    seo: {
      title: { [locale]: data.seoTitle || data.title },
      description: { [locale]: data.seoDescription || data.description || "" },
      canonicalUrl: canonical,
      robotsIndex: true,
      robotsFollow: true,
      schemaType: "BlogPosting",
    },
    createdAt: now,
    updatedAt: now,
  });
  return { id: result.insertedId.toHexString(), title: data.title, slug, locale };
}

export async function saveRecordAction(formData: FormData) {
  if (!(await verifyCsrfToken(formData.get("csrfToken")))) safeAdminRedirect("/admin/dashboard?error=session");
  const user = await requireAdminUser("content.write");
  const parsed = recordSchema.safeParse({
    module: formData.get("module"),
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    description: formData.get("description") || "",
    status: formData.get("status") || "published",
    language: formData.get("language") || undefined,
    path: formData.get("path") || undefined,
    slug: formData.get("slug") || undefined,
    seoTitle: formData.get("seoTitle") || undefined,
    seoDescription: formData.get("seoDescription") || undefined,
    canonicalUrl: formData.get("canonicalUrl") || undefined,
    category: formData.get("category") || undefined,
    tags: formData.get("tags") || undefined,
    featuredImage: formData.get("featuredImage") || undefined,
    featuredImageAlt: formData.get("featuredImageAlt") || undefined,
    bodyHtml: formData.get("bodyHtml") || undefined,
    pageHtml: formData.get("pageHtml") || undefined,
    renderMode: formData.get("renderMode") || undefined,
    sectionsJson: formData.get("sectionsJson") || undefined,
    contentEditsJson: formData.get("contentEditsJson") || undefined,
    createRedirect: formBoolean(formData, "createRedirect"),
  });
  if (!parsed.success) safeAdminRedirect("/admin/dashboard?error=validation");

  const data = parsed.data;
  try {
    if (data.module === "pages" && data.id) {
      const updated = await updatePageRecord(data);
      await audit("content.updated", "page", updated.id, updated.title, { module: data.module, user: user.email });
      revalidatePath(updated.path);
      revalidateCmsTags("cms-pages");
    } else if (data.module === "pages") {
      const created = await createPageRecord(data);
      await audit("content.created", "page", created.id, created.title, { module: data.module, user: user.email });
      revalidatePath(created.path);
      revalidateCmsTags("cms-pages");
    } else if (data.module === "blog" && data.id) {
      const updated = await updateBlogRecord(data);
      await audit("content.updated", "blog", updated.id, updated.title, { module: data.module, user: user.email });
      revalidatePath(updated.locale === "el" ? `/el/seo-blog/${updated.slug}/` : `/blog/${updated.slug}/`);
      revalidateCmsTags("cms-blog");
    } else if (data.module === "blog") {
      const created = await createBlogRecord(data);
      await audit("content.created", "blog", created.id, created.title, { module: data.module, user: user.email });
      revalidatePath(created.locale === "el" ? `/el/seo-blog/${created.slug}/` : `/blog/${created.slug}/`);
      revalidateCmsTags("cms-blog");
    } else {
      await audit("content.update_skipped", data.module, data.id, data.title, { reason: "Module uses JSON editor." });
    }
  } catch {
    safeAdminRedirect(`/admin/${data.module}?error=validation`);
  }

  revalidatePath("/admin");
  safeAdminRedirect(`/admin/${data.module}?notice=saved`);
}

export async function saveJsonRecordAction(formData: FormData) {
  if (!(await verifyCsrfToken(formData.get("csrfToken")))) safeAdminRedirect("/admin/dashboard?error=session");
  const parsed = jsonRecordSchema.safeParse({
    module: formData.get("module"),
    id: formData.get("id") || undefined,
    jsonData: formData.get("jsonData"),
  });
  if (!parsed.success) safeAdminRedirect("/admin/dashboard?error=validation");

  const moduleSlug = parsed.data.module as AdminModuleSlug;
  const storage = getModuleStorage(moduleSlug);
  if (!storage.collectionName && !storage.settingKey) safeAdminRedirect(`/admin/${moduleSlug}?error=unsupported`);

  const user = await requireAdminUser(writePermissionForModule(moduleSlug));
  let record: Record<string, unknown> = {};
  try {
    record = parseEditableJson(parsed.data.jsonData);
  } catch {
    safeAdminRedirect(`/admin/${moduleSlug}?error=json`);
  }

  const now = new Date();
  if (storage.settingKey) {
    await (await mongoCollection("settings")).updateOne(
      { key: storage.settingKey },
      {
        $set: { key: storage.settingKey, value: record, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  } else if (storage.collectionName) {
    const collection = await mongoCollection(storage.collectionName);
    if (parsed.data.id && parsed.data.id !== "new") {
      await collection.updateOne(byId(parsed.data.id), { $set: { ...record, updatedAt: now } });
    } else {
      await collection.insertOne({ ...defaultJsonForModule(moduleSlug), ...record, createdAt: now, updatedAt: now });
    }
  }

  for (const path of revalidationPathsForModule(moduleSlug)) {
    revalidatePath(path);
  }
  revalidateCmsTags(...cacheTagsForModule(moduleSlug));
  revalidatePath("/admin");
  await audit("content.json_saved", moduleSlug, parsed.data.id, String(record.title || record.name || record.key || moduleSlug), {
    module: moduleSlug,
    user: user.email,
  });
  safeAdminRedirect(`/admin/${moduleSlug}?notice=saved`);
}

export async function softDeleteRecordAction(formData: FormData) {
  if (!(await verifyCsrfToken(formData.get("csrfToken")))) safeAdminRedirect("/admin/dashboard?error=session");
  await requireAdminUser("content.write");
  const moduleSlug = String(formData.get("module") || "");
  const id = String(formData.get("id") || "");
  const now = new Date();
  const collectionName = moduleSlug === "pages" ? "pages" : moduleSlug === "blog" ? "blogPosts" : collectionModuleNames[moduleSlug as AdminModuleSlug];
  if (!collectionName) safeAdminRedirect(`/admin/${moduleSlug}?error=unsupported`);
  await (await mongoCollection(collectionName)).updateOne(byId(id), {
    $set: moduleSlug === "redirects" ? { active: false, updatedAt: now } : { deletedAt: now, status: "soft_deleted", updatedAt: now },
  });
  await audit("content.deleted", moduleSlug, id);
  revalidateCmsTags(...cacheTagsForModule(moduleSlug as AdminModuleSlug));
  revalidatePath("/admin");
  safeAdminRedirect(`/admin/${moduleSlug}?notice=deleted`);
}

export async function restoreRecordAction(formData: FormData) {
  if (!(await verifyCsrfToken(formData.get("csrfToken")))) safeAdminRedirect("/admin/dashboard?error=session");
  await requireAdminUser("content.write");
  const moduleSlug = String(formData.get("module") || "");
  const id = String(formData.get("id") || "");
  const collectionName = moduleSlug === "pages" ? "pages" : moduleSlug === "blog" ? "blogPosts" : collectionModuleNames[moduleSlug as AdminModuleSlug];
  if (!collectionName) safeAdminRedirect(`/admin/${moduleSlug}?error=unsupported`);
  await (await mongoCollection(collectionName)).updateOne(byId(id), {
    $set: moduleSlug === "redirects" ? { active: true, updatedAt: new Date() } : { deletedAt: null, status: "draft", updatedAt: new Date() },
  });
  await audit("content.restored", moduleSlug, id);
  revalidateCmsTags(...cacheTagsForModule(moduleSlug as AdminModuleSlug));
  revalidatePath("/admin");
  safeAdminRedirect(`/admin/${moduleSlug}?notice=restored`);
}

export async function exportModuleAction(formData: FormData) {
  const user = await requireAdminUser("backups.export");
  const moduleSlug = String(formData.get("module") || "pages") as AdminModuleSlug;
  if (!can(user, "backups.export")) safeAdminRedirect(`/admin/${moduleSlug}?error=forbidden`);
  await audit("backup.export_requested", moduleSlug);
  safeAdminRedirect(`/admin/${moduleSlug}?notice=export-started`);
}

export async function uploadMediaAction(formData: FormData) {
  if (!(await verifyCsrfToken(formData.get("csrfToken")))) safeAdminRedirect("/admin/media?error=session");
  const user = await requireAdminUser("media.write");
  const file = formData.get("file");
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    safeAdminRedirect("/admin/media?error=file-required");
  }

  try {
    const stored = await saveUpload(file as File);
    const title = String(formData.get("title") || stored.originalFileName);
    const asset = {
      fileName: stored.fileName,
      originalFileName: stored.originalFileName,
      title,
      url: stored.url,
      storageKey: stored.storageKey,
      storageDriver: stored.storageDriver,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      alt: { en: String(formData.get("altEn") || ""), el: String(formData.get("altEl") || "") },
      caption: { en: "", el: "" },
      description: { en: "", el: "" },
      decorative: formBoolean(formData, "decorative"),
      uploadedById: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await (await mongoCollection("mediaAssets")).insertOne(asset);
    await audit("media.uploaded", "media", result.insertedId.toHexString(), title);
    revalidateCmsTags("cms-pages", "cms-blog");
    revalidatePath("/admin/media");
    safeAdminRedirect("/admin/media?notice=uploaded");
  } catch (error) {
    await audit("media.upload_failed", "media", null, null, { message: error instanceof Error ? error.message : "Upload failed" });
    safeAdminRedirect("/admin/media?error=upload");
  }
}
