import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import type { Collection } from "mongodb";
import { normalizePath, routeMap } from "@/src/content/route-map";
import { createPageTranslationAction, saveJsonRecordAction, saveRecordAction } from "@/src/lib/admin/actions";
import { createCsrfToken, requireAdminUser } from "@/src/lib/admin/auth";
import { defaultJsonForModule, editableCmsModules, getModuleStorage, writePermissionForModule } from "@/src/lib/admin/module-config";
import { getAdminModule, type AdminModuleSlug } from "@/src/lib/admin/modules";
import { documentId, idFilter, mongoCollection } from "@/src/lib/mongo";
import { activeLanguages, getLanguageSettings, languageLabel as cmsLanguageLabel, languagePathPrefix, type CmsLanguage } from "@/src/lib/cms/languages";
import { ImageUrlField } from "./ImageUrlField";
import { JsonFieldEditor } from "./JsonFieldEditor";
import { LanguageManagerEditor } from "./LanguageManagerEditor";
import { PageContentEditor } from "./PageContentEditor";
import { RichTextEditor } from "./RichTextEditor";

type EditRecord = {
  id?: string;
  jsonData?: string;
  languageVersions?: LanguageVersion[];
  title: string;
  description: string;
  status: string;
  language: string;
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
  locale: string;
  label: string;
  id?: string;
  title: string;
  path: string;
  status: string;
  current: boolean;
};

function localized(value: unknown, locale: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const copy = value as Record<string, unknown>;
  const direct = copy[locale];
  if (typeof direct === "string") return direct;
  if (typeof copy.en === "string") return copy.en;
  if (typeof copy.el === "string") return copy.el;
  const fallback = Object.values(copy).find((item) => typeof item === "string" && item.trim());
  return typeof fallback === "string" ? fallback : "";
}

function displayTitle(value: unknown, locale = "en") {
  if (typeof value === "string") return value;
  return localized(value, locale);
}

function pageLocale(document: Record<string, unknown>, languages: CmsLanguage[], defaultLanguage: string) {
  const explicitLocale = String(document.locale || document.language || "").trim().toLowerCase();
  if (explicitLocale) return explicitLocale;
  const path = normalizePath(String(document.path || "/"));
  const match = languages.find((language) => language.pathPrefix && path.startsWith(`${language.pathPrefix}/`));
  return match?.code || defaultLanguage;
}

function adminLanguageLabel(language: CmsLanguage) {
  return language.name || cmsLanguageLabel(language);
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

function translationStatus(document?: Record<string, unknown>) {
  if (!document) return "Missing";
  const status = String(document.status || "published").toLowerCase();
  if (status === "published") return "Complete";
  if (status === "draft") return "Draft";
  if (status === "in_review") return "In review";
  if (status === "scheduled") return "Scheduled";
  return status.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());
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

async function getJsonRecord(moduleSlug: AdminModuleSlug, id: string, languages: CmsLanguage[], defaultLanguage: string): Promise<EditRecord | null> {
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
  const record = await (await mongoCollection<Record<string, unknown>>(collectionName)).findOne(await idFilter(id));
  if (!record) return null;
  const locale = pageLocale(record, languages, defaultLanguage);
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

async function getPageLanguageVersions(
  page: Record<string, unknown>,
  pages: Collection<Record<string, unknown>>,
  languages: CmsLanguage[],
  defaultLanguage: string,
): Promise<LanguageVersion[]> {
  const currentPath = normalizePath(String(page.path || "/"));
  const alternatePath = String(page.alternatePath || exactAlternatePath(currentPath) || "");
  const normalizedAlternatePath = alternatePath ? normalizePath(alternatePath) : "";
  const translationKey = String(page.translationKey || page.translationGroup || "").trim();
  const versions = new Map<string, LanguageVersion>();

  const addDocument = (document: Record<string, unknown>, current: boolean) => {
    const locale = pageLocale(document, languages, defaultLanguage);
    const language = languages.find((item) => item.code === locale);
    versions.set(locale, {
      locale,
      label: language ? adminLanguageLabel(language) : locale.toUpperCase(),
      id: documentId(document),
      title: displayTitle(document.title, locale) || String(document.path || ""),
      path: normalizePath(String(document.path || "")),
      status: translationStatus(document),
      current,
    });
  };

  addDocument(page, true);

  if (translationKey) {
    const linkedPages = await pages
      .find(
        { translationKey, deletedAt: { $ne: true } },
        { projection: { _id: 1, title: 1, path: 1, locale: 1, language: 1, translationKey: 1, deletedAt: 1 } },
      )
      .toArray();

    for (const linkedPage of linkedPages) {
      addDocument(linkedPage, documentId(linkedPage) === documentId(page));
    }
  }

  if (normalizedAlternatePath) {
    const alternate = await pages.findOne(
      { path: normalizedAlternatePath },
      { projection: { _id: 1, title: 1, path: 1, locale: 1, language: 1, deletedAt: 1 } },
    );

    if (alternate && !alternate.deletedAt) {
      addDocument(alternate, false);
    }
  }

  return languages.map((language) => {
    const existing = versions.get(language.code);
    if (existing) return existing;

    const currentSlug = String(page.slug || page.sourceSlug || "page");
    const prefix = languagePathPrefix(language.code, defaultLanguage, language.pathPrefix);
    const missingPath = prefix ? `${prefix}/${currentSlug}/`.replace(/\/{2,}/g, "/") : `/${currentSlug}/`;
    return {
      locale: language.code,
      label: adminLanguageLabel(language),
      title: "Translation not created yet",
      path: missingPath,
      status: "Missing",
      current: false,
    };
  });
}

async function getRecord(moduleSlug: string, id: string, languages: CmsLanguage[], defaultLanguage: string): Promise<EditRecord | null> {
  if (id === "new") {
    return emptyRecord({ title: "", language: defaultLanguage });
  }

  if (moduleSlug === "pages") {
    const pages = await mongoCollection<Record<string, unknown>>("pages");
    const page = await pages.findOne(await idFilter(id));
    if (!page) return null;
    const locale = pageLocale(page, languages, defaultLanguage);
    const seo = typeof page.seo === "object" && page.seo ? (page.seo as Record<string, unknown>) : {};
    const tags = Array.isArray(page.tags) ? page.tags.map(String).join(", ") : "";
    return {
      id: documentId(page),
      languageVersions: await getPageLanguageVersions(page, pages, languages, defaultLanguage),
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
    const post = await (await mongoCollection<Record<string, unknown>>("blogPosts")).findOne(await idFilter(id));
    if (!post) return null;
    const locale = pageLocale(post, languages, defaultLanguage);
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

function LanguageVersionSwitcher({ versions, sourcePageId }: { versions?: LanguageVersion[]; sourcePageId?: string }) {
  if (!versions || versions.length < 2) return null;

  return (
    <section className="admin-language-switcher" aria-label="Page language versions">
      <div>
        <strong>Language version</strong>
        <p className="admin-muted">Choose a page language, or create the version you need.</p>
      </div>
      <div className="admin-language-options">
        {sourcePageId ? <input type="hidden" name="sourcePageId" value={sourcePageId} /> : null}
        {versions.map((version) =>
          version.current ? (
            <span className="admin-language-pill admin-language-pill-active" key={version.locale} aria-current="page">
              {version.label}: {version.status}
            </span>
          ) : version.id ? (
            <Link className="admin-language-pill" key={version.locale} href={`/admin/pages?edit=${version.id}`}>
              {version.label}: {version.status}
            </Link>
          ) : sourcePageId ? (
            <button
              className="admin-language-pill admin-language-pill-create"
              formAction={createPageTranslationAction.bind(null, version.locale)}
              key={version.locale}
              title={version.path}
              type="submit"
            >
              Add {version.label} translation
            </button>
          ) : (
            <span className="admin-language-pill admin-language-pill-disabled" key={version.locale}>
              {version.label}: Missing
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
  const languageSettings = await getLanguageSettings();
  const languages = activeLanguages(languageSettings);
  const record =
    adminModule.slug === "pages" || adminModule.slug === "blog"
      ? await getRecord(adminModule.slug, id, languages, languageSettings.defaultLanguage)
      : await getJsonRecord(adminModule.slug, id, languages, languageSettings.defaultLanguage);
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
          {adminModule.slug === "languages" ? <LanguageManagerEditor jsonData={record.jsonData} /> : <JsonFieldEditor jsonData={record.jsonData} />}
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
          {adminModule.slug === "pages" ? <LanguageVersionSwitcher versions={record.languageVersions} sourcePageId={record.id} /> : null}

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
                  {languages.map((language) => (
                    <option value={language.code} key={language.code}>
                      {adminLanguageLabel(language)}
                    </option>
                  ))}
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
