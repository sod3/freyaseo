import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import type { Collection } from "mongodb";
import { normalizePath, routeMap } from "@/src/content/route-map";
import { saveJsonRecordAction, saveRecordAction } from "@/src/lib/admin/actions";
import { createCsrfToken, requireAdminUser } from "@/src/lib/admin/auth";
import { defaultJsonForModule, editableCmsModules, getModuleStorage, writePermissionForModule } from "@/src/lib/admin/module-config";
import { getAdminModule, type AdminModuleSlug } from "@/src/lib/admin/modules";
import { documentId, idFilter, mongoCollection } from "@/src/lib/mongo";
import { ImageUrlField } from "./ImageUrlField";
import { JsonFieldEditor } from "./JsonFieldEditor";
import { PageContentEditor } from "./PageContentEditor";
import { RichTextEditor } from "./RichTextEditor";

type EditRecord = {
  id?: string;
  jsonData?: string;
  languageVersions?: LanguageVersion[];
  title: string;
  description: string;
  status: string;
  language: "en" | "el";
  path: string;
  slug: string;
  category: string;
  tags: string;
  featuredImage: string;
  featuredImageAlt: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  bodyHtml: string;
  pageHtml: string;
  renderMode: "wordpressHtml" | "structuredBlocks";
  sectionsJson: string;
};

type LanguageVersion = {
  locale: "en" | "el";
  label: string;
  id?: string;
  title: string;
  path: string;
  current: boolean;
};

function localized(value: unknown, locale: "en" | "el") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const copy = value as Partial<Record<"en" | "el", string>>;
  return copy[locale] || copy.en || copy.el || "";
}

function displayTitle(value: unknown, locale: "en" | "el" = "en") {
  if (typeof value === "string") return value;
  return localized(value, locale);
}

function pageLocale(document: Record<string, unknown>): "en" | "el" {
  return document.locale === "el" || String(document.path || "").startsWith("/el/") ? "el" : "en";
}

function languageLabel(locale: "en" | "el") {
  return locale === "el" ? "Greek" : "English";
}

function exactAlternatePath(pathname: string) {
  const normalized = normalizePath(pathname);
  return routeMap[normalized as keyof typeof routeMap] || "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToEditorHtml(value: string) {
  const body = value.trim();
  if (!body || /^</.test(body)) return body;
  return body
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

function editableJson(document: Record<string, unknown>) {
  const copy = { ...document };
  delete copy._id;
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  delete copy.deletedAt;
  return JSON.stringify(copy, null, 2);
}

function emptyRecord(overrides: Partial<EditRecord> = {}): EditRecord {
  return {
    title: "",
    description: "",
    status: "DRAFT",
    language: "en",
    path: "",
    slug: "",
    category: "",
    tags: "",
    featuredImage: "",
    featuredImageAlt: "",
    seoTitle: "",
    seoDescription: "",
    canonicalUrl: "",
    bodyHtml: "",
    pageHtml: "",
    renderMode: "structuredBlocks",
    sectionsJson: "[]",
    ...overrides,
  };
}

async function getJsonRecord(moduleSlug: AdminModuleSlug, id: string): Promise<EditRecord | null> {
  const storage = getModuleStorage(moduleSlug);
  if (!storage.collectionName && !storage.settingKey) return null;

  if (storage.settingKey) {
    const setting = await (await mongoCollection<Record<string, unknown>>("settings")).findOne({ key: storage.settingKey });
    const jsonData = JSON.stringify((setting?.value as Record<string, unknown> | undefined) || defaultJsonForModule(moduleSlug), null, 2);
    return emptyRecord({
      id: setting ? documentId(setting) : undefined,
      title: storage.settingKey,
      jsonData,
    });
  }

  if (id === "new") {
    return emptyRecord({
      title: `New ${moduleSlug}`,
      jsonData: JSON.stringify(defaultJsonForModule(moduleSlug), null, 2),
    });
  }

  const collectionName = storage.collectionName;
  if (!collectionName) return null;
  const record = await (await mongoCollection<Record<string, unknown>>(collectionName)).findOne(idFilter(id));
  if (!record) return null;
  const locale = record.locale === "el" || record.language === "el" ? "el" : "en";
  const jsonData = editableJson(record);
  return emptyRecord({
    id: documentId(record),
    title:
      displayTitle(record.title, locale) ||
      displayTitle(record.name, locale) ||
      displayTitle(record.question, locale) ||
      String(record.key || record.sourceUrl || moduleSlug),
    jsonData,
  });
}

async function getPageLanguageVersions(page: Record<string, unknown>, pages: Collection<Record<string, unknown>>): Promise<LanguageVersion[]> {
  const currentLocale = pageLocale(page);
  const currentPath = normalizePath(String(page.path || "/"));
  const alternatePath = String(page.alternatePath || exactAlternatePath(currentPath) || "");
  const normalizedAlternatePath = alternatePath ? normalizePath(alternatePath) : "";
  const versions = new Map<"en" | "el", LanguageVersion>();

  const addDocument = (document: Record<string, unknown>, current: boolean) => {
    const locale = pageLocale(document);
    versions.set(locale, {
      locale,
      label: languageLabel(locale),
      id: documentId(document),
      title: displayTitle(document.title, locale) || String(document.path || ""),
      path: normalizePath(String(document.path || "")),
      current,
    });
  };

  addDocument(page, true);

  if (normalizedAlternatePath) {
    const alternate = await pages.findOne(
      { path: normalizedAlternatePath },
      { projection: { _id: 1, title: 1, path: 1, locale: 1, deletedAt: 1 } },
    );

    if (alternate && !alternate.deletedAt) {
      addDocument(alternate, false);
    } else {
      const missingLocale = currentLocale === "en" ? "el" : "en";
      versions.set(missingLocale, {
        locale: missingLocale,
        label: languageLabel(missingLocale),
        title: "Translation not created yet",
        path: normalizedAlternatePath,
        current: false,
      });
    }
  }

  return (["en", "el"] as const).map((locale) => versions.get(locale)).filter(Boolean) as LanguageVersion[];
}

async function getRecord(moduleSlug: string, id: string): Promise<EditRecord | null> {
  if (id === "new") {
    return emptyRecord({ title: "" });
  }

  if (moduleSlug === "pages") {
    const pages = await mongoCollection<Record<string, unknown>>("pages");
    const page = await pages.findOne(idFilter(id));
    if (!page) return null;
    const locale = pageLocale(page);
    const seo = typeof page.seo === "object" && page.seo ? (page.seo as Record<string, unknown>) : {};
    const tags = Array.isArray(page.tags) ? page.tags.map(String).join(", ") : "";
    return {
      id: documentId(page),
      languageVersions: await getPageLanguageVersions(page, pages),
      title: String(page.title || ""),
      description: String(page.description || ""),
      status: String(page.status || "draft"),
      language: locale,
      path: String(page.path || ""),
      slug: String(page.slug || page.sourceSlug || ""),
      category: String(page.category || ""),
      tags,
      featuredImage: String(seo.openGraphImage || ""),
      featuredImageAlt: localized(seo.openGraphImageAlt, locale),
      seoTitle: localized(seo.title, locale),
      seoDescription: localized(seo.description, locale),
      canonicalUrl: String(seo.canonicalUrl || page.path || ""),
      bodyHtml: "",
      pageHtml: String(page.html || ""),
      renderMode: page.renderMode === "structuredBlocks" ? "structuredBlocks" : "wordpressHtml",
      sectionsJson: JSON.stringify(page.sections || [], null, 2),
    };
  }

  if (moduleSlug === "blog") {
    const post = await (await mongoCollection<Record<string, unknown>>("blogPosts")).findOne(idFilter(id));
    if (!post) return null;
    const locale = post.language === "el" || post.locale === "el" ? "el" : "en";
    const seo = typeof post.seo === "object" && post.seo ? (post.seo as Record<string, unknown>) : {};
    const slug = String(post.slug || "");
    const tags = Array.isArray(post.tags) ? post.tags.map(String).join(", ") : "";
    return {
      id: documentId(post),
      title: String(post.title || ""),
      description: String(post.excerpt || ""),
      status: String(post.status || (post.draft ? "draft" : "published")),
      language: locale,
      path: locale === "el" ? `/el/seo-blog/${slug}/` : `/blog/${slug}/`,
      slug,
      category: String(post.category || ""),
      tags,
      featuredImage: String(post.featuredImage || post.existingImagePath || ""),
      featuredImageAlt: localized(post.featuredImageAlt, locale),
      seoTitle: localized(seo.title, locale),
      seoDescription: localized(seo.description, locale),
      canonicalUrl: String(seo.canonicalUrl || (locale === "el" ? `/el/seo-blog/${slug}/` : `/blog/${slug}/`)),
      bodyHtml: markdownToEditorHtml(String(post.bodyHtml || post.bodyMarkdown || "")),
      pageHtml: "",
      renderMode: "structuredBlocks",
      sectionsJson: "[]",
    };
  }

  return null;
}

function LanguageVersionSwitcher({ versions }: { versions?: LanguageVersion[] }) {
  if (!versions || versions.length < 2) return null;

  return (
    <section className="admin-language-switcher" aria-label="Page language versions">
      <div>
        <strong>Language version</strong>
        <p className="admin-muted">Choose English or Greek, then edit that page version below.</p>
      </div>
      <div className="admin-language-options">
        {versions.map((version) =>
          version.current ? (
            <span className="admin-language-pill admin-language-pill-active" key={version.locale} aria-current="page">
              {version.label}
            </span>
          ) : version.id ? (
            <Link className="admin-language-pill" key={version.locale} href={`/admin/pages?edit=${version.id}`}>
              {version.label}
            </Link>
          ) : (
            <span className="admin-language-pill admin-language-pill-disabled" key={version.locale} title={version.path}>
              {version.label} missing
            </span>
          ),
        )}
      </div>
    </section>
  );
}

export async function AdminRecordEditor({ moduleSlug, id }: { moduleSlug: string; id: string }) {
  const adminModule = getAdminModule(moduleSlug);
  if (!adminModule || !editableCmsModules.has(adminModule.slug)) notFound();

  await requireAdminUser(adminModule.slug === "pages" || adminModule.slug === "blog" ? "content.write" : writePermissionForModule(adminModule.slug));
  const csrfToken = await createCsrfToken();
  const record =
    adminModule.slug === "pages" || adminModule.slug === "blog"
      ? await getRecord(adminModule.slug, id)
      : await getJsonRecord(adminModule.slug, id);
  if (!record) notFound();

  const isNew = id === "new";
  const heading = isNew ? `Create ${adminModule.slug === "blog" ? "post" : adminModule.label}` : `Edit ${record.title}`;

  return (
    <>
      <div className="admin-page-title">
        <Link className="admin-muted" href={`/admin/${adminModule.slug}`}>
          <ArrowLeft size={16} aria-hidden /> Back to {adminModule.label}
        </Link>
        <h1>{heading}</h1>
        <p className="admin-muted">Edit the page content, images, metadata and publishing details.</p>
      </div>

      {record.jsonData ? (
        <form className="admin-form-panel" action={saveJsonRecordAction}>
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="module" value={adminModule.slug} />
          {record.id ? <input type="hidden" name="id" value={record.id} /> : null}
          <JsonFieldEditor jsonData={record.jsonData} />
          <div className="admin-actions">
            <button className="admin-button admin-button-primary" type="submit">
              <Save size={17} aria-hidden />
              Save
            </button>
            <Link className="admin-button admin-button-secondary" href={`/admin/${adminModule.slug}`}>
              Cancel
            </Link>
          </div>
        </form>
      ) : (
        <form className="admin-form-panel" action={saveRecordAction}>
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="module" value={adminModule.slug} />
          {record.id ? <input type="hidden" name="id" value={record.id} /> : null}
          {adminModule.slug === "pages" ? <LanguageVersionSwitcher versions={record.languageVersions} /> : null}

          <section className="admin-editor-section">
            <h2>Page details</h2>
            <label className="admin-field">
              <span>Title</span>
              <input className="admin-input" name="title" defaultValue={record.title} required />
            </label>

            <label className="admin-field">
              <span>{adminModule.slug === "blog" ? "Excerpt" : "Page description"}</span>
              <textarea className="admin-textarea" name="description" defaultValue={record.description} />
            </label>

            <div className="admin-grid">
              <label className="admin-field">
                <span>Language</span>
                <select className="admin-select" name="language" defaultValue={record.language}>
                  <option value="en">English</option>
                  <option value="el">Greek</option>
                </select>
              </label>
              <label className="admin-field">
                <span>Status</span>
                <select className="admin-select" name="status" defaultValue={record.status.toUpperCase()}>
                  <option value="DRAFT">Draft</option>
                  <option value="IN_REVIEW">In review</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="UNPUBLISHED">Unpublished</option>
                  <option value="HIDDEN">Hidden</option>
                </select>
              </label>
            </div>

            <div className="admin-grid">
              <label className="admin-field">
                <span>Category</span>
                <input className="admin-input" name="category" defaultValue={record.category} placeholder="Service, Company, Landing page" />
              </label>
              <label className="admin-field">
                <span>Tags</span>
                <input className="admin-input" name="tags" defaultValue={record.tags} placeholder="seo, ai, homepage" />
              </label>
            </div>
          </section>

          {adminModule.slug === "blog" ? (
            <section className="admin-editor-section">
              <h2>Article body</h2>
              <RichTextEditor name="bodyHtml" defaultValue={record.bodyHtml} />
            </section>
          ) : null}

          {adminModule.slug === "pages" ? (
            <section className="admin-editor-section">
              <h2>Page content</h2>
              <PageContentEditor key={record.id || record.path || "new-page"} html={record.pageHtml} />
              <details className="admin-advanced-editor">
                <summary>Advanced HTML and structured sections</summary>
                <label className="admin-field">
                  <span>Public URL path</span>
                  <input className="admin-input" name="path" defaultValue={record.path} placeholder="/new-page/" />
                </label>
                <label className="admin-field">
                  <span>Render mode</span>
                  <select className="admin-select" name="renderMode" defaultValue={record.renderMode}>
                    <option value="wordpressHtml">WordPress HTML snapshot</option>
                    <option value="structuredBlocks">Structured CMS blocks</option>
                  </select>
                </label>
                <label className="admin-field">
                  <span>Structured sections JSON</span>
                  <textarea className="admin-textarea admin-code-textarea" name="sectionsJson" defaultValue={record.sectionsJson} spellCheck={false} />
                </label>
              </details>
            </section>
          ) : null}

          <section className="admin-editor-section">
            <h2>URL, image and SEO</h2>
            <label className="admin-field">
              <span>Slug</span>
              <input className="admin-input" name="slug" defaultValue={record.slug} placeholder="new-page" />
            </label>

            <div className="admin-grid">
              <ImageUrlField label="Featured image" name="featuredImage" defaultValue={record.featuredImage} altText={record.featuredImageAlt} />
              <label className="admin-field">
                <span>Featured image alt text</span>
                <input className="admin-input" name="featuredImageAlt" defaultValue={record.featuredImageAlt} />
              </label>
            </div>

            {!isNew && adminModule.slug === "pages" ? (
              <label className="admin-checkbox">
                <input type="checkbox" name="createRedirect" defaultChecked />
                <span>Create a permanent redirect if the public URL path changes</span>
              </label>
            ) : null}

            <label className="admin-field">
              <span>SEO title</span>
              <input className="admin-input" name="seoTitle" defaultValue={record.seoTitle} />
            </label>
            <label className="admin-field">
              <span>Meta description</span>
              <textarea className="admin-textarea" name="seoDescription" defaultValue={record.seoDescription} />
            </label>
            <label className="admin-field">
              <span>Canonical URL</span>
              <input className="admin-input" name="canonicalUrl" defaultValue={record.canonicalUrl} />
            </label>
          </section>

          <div className="admin-actions admin-sticky-actions">
            <button className="admin-button admin-button-primary" type="submit">
              <Save size={17} aria-hidden />
              Save
            </button>
            <Link className="admin-button admin-button-secondary" href={`/admin/${adminModule.slug}`}>
              Cancel
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
