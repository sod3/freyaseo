import type { Collection, Document, Sort } from "mongodb";
import { documentId, isMongoConfigured, mongoCollection } from "@/src/lib/mongo";
import { activeLanguages, getLanguageSettings } from "@/src/lib/cms/languages";
import { collectionModuleNames, settingModuleKeys } from "./module-config";
import { getAdminModule, type AdminModuleSlug } from "./modules";

export type AdminRecord = {
  id: string;
  title: string;
  description?: string;
  status?: string;
  language?: string;
  href?: string;
  updatedAt?: Date | null;
  meta?: string;
  translations?: Array<{
    locale: string;
    label: string;
    status: string;
    href?: string;
    id?: string;
  }>;
};

export type DashboardData = {
  configured: boolean;
  counts: {
    pages: number;
    blogPosts: number;
    services: number;
    tools: number;
    drafts: number;
    published: number;
    missingTranslations: number;
    missingSeoDescriptions: number;
    missingAltText: number;
    submissions: number;
  };
  recentSubmissions: FormSubmissionRecord[];
  recentActivity: AdminRecord[];
  warnings: string[];
};

export type FormSubmissionRecord = {
  id: string;
  formKey: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  budget: string;
  subject: string;
  message: string;
  sourcePage: string;
  language: string;
  submittedAt?: Date | null;
  payload: Record<string, string>;
};

export type AdminPageInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

function localized(value: unknown, preferred = "en") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const copy = value as Record<string, unknown>;
  const direct = copy[preferred];
  if (typeof direct === "string") return direct;
  if (typeof copy.en === "string") return copy.en;
  if (typeof copy.el === "string") return copy.el;
  const fallback = Object.values(copy).find((item) => typeof item === "string" && item.trim());
  return typeof fallback === "string" ? fallback : "";
}

function statusLabel(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function payloadValue(payload: Record<string, unknown>, key: string) {
  return stringValue(payload[key]);
}

function formPayload(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function mapFormSubmission(submission: Record<string, unknown>): FormSubmissionRecord {
  const payload = formPayload(submission.payload);
  const firstName = stringValue(submission.firstName) || payloadValue(payload, "firstName");
  const lastName = stringValue(submission.lastName) || payloadValue(payload, "lastName");
  const fallbackName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    id: documentId(submission),
    formKey: stringValue(submission.formKey) || "contact",
    name: stringValue(submission.name) || payloadValue(payload, "name") || fallbackName,
    email: stringValue(submission.email) || payloadValue(payload, "email"),
    phone: stringValue(submission.phone) || payloadValue(payload, "phone"),
    company: stringValue(submission.company) || payloadValue(payload, "company"),
    service: stringValue(submission.service) || payloadValue(payload, "service"),
    budget: stringValue(submission.budget) || payloadValue(payload, "budget"),
    subject: stringValue(submission.subject) || payloadValue(payload, "subject"),
    message: stringValue(submission.message) || payloadValue(payload, "message"),
    sourcePage: stringValue(submission.sourcePage) || payloadValue(payload, "sourcePage"),
    language: stringValue(submission.language) || payloadValue(payload, "language"),
    submittedAt: submission.createdAt instanceof Date ? submission.createdAt : null,
    payload: Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, stringValue(value)])),
  };
}

function filterRecords(records: AdminRecord[], search?: string, language?: string, status?: string) {
  const term = search?.trim().toLowerCase();
  return records.filter((record) => {
    const translationText = (record.translations || []).map((translation) => `${translation.locale} ${translation.status} ${translation.href || ""}`).join(" ");
    if (term && !`${record.title} ${record.description || ""} ${record.href || ""} ${translationText}`.toLowerCase().includes(term)) return false;
    if (
      language &&
      language !== "all" &&
      record.language !== language &&
      !record.translations?.some((translation) => translation.locale === language && translation.id)
    ) {
      return false;
    }
    if (status && status !== "all" && record.status?.toLowerCase() !== status.toLowerCase()) return false;
    return true;
  });
}

const pageListProjection = {
  title: 1,
  description: 1,
  status: 1,
  locale: 1,
  language: 1,
  path: 1,
  sourceSlug: 1,
  translationKey: 1,
  translationGroup: 1,
  alternatePath: 1,
  category: 1,
  tags: 1,
  updatedAt: 1,
};

const blogListProjection = {
  title: 1,
  excerpt: 1,
  status: 1,
  draft: 1,
  language: 1,
  locale: 1,
  slug: 1,
  updatedAt: 1,
};

function missingLocalizedObjectFilter(field: string, languageCodes: string[]) {
  return {
    $or: languageCodes.map((code) => ({ $or: [{ [`${field}.${code}`]: { $exists: false } }, { [`${field}.${code}`]: "" }] })),
  };
}

function pageSortRank(path: string) {
  const order = [
    "/",
    "/seo-marketing/",
    "/ai-seo-2/",
    "/automation/",
    "/report/",
    "/tool-generation/",
    "/certificates/",
    "/about/",
    "/contact-2/",
    "/blog/",
    "/el/seo-agency/",
    "/el/seo-marketing-2/",
    "/el/ai-seo-4/",
    "/el/automation-2/",
    "/el/report-2/",
    "/el/tool-generation-2/",
    "/el/certificates-seo/",
    "/el/about-us/",
    "/el/lets-contact/",
    "/el/seo-blog/",
  ];
  const index = order.indexOf(path);
  return index >= 0 ? index : order.length;
}

function pageAreaLabel(path: string) {
  if (path === "/") return "Homepage";
  if (path.includes("seo-marketing")) return "Service page";
  if (path.includes("ai-seo")) return "Service page";
  if (path.includes("automation")) return "Service page";
  if (path.includes("report")) return "Service page";
  if (path.includes("tool-generation")) return "Service page";
  if (path.includes("certificate")) return "Certificate page";
  if (path.includes("about")) return "About page";
  if (path.includes("contact") || path.includes("lets-contact")) return "Contact page";
  if (path.includes("blog")) return "Blog listing";
  return "Website page";
}

function pageGroupKey(page: Record<string, unknown>) {
  const explicit = String(page.translationKey || page.translationGroup || "").trim();
  if (explicit) return explicit;
  const alternate = String(page.alternatePath || "").trim();
  if (alternate) return `alternate:${alternate}`;
  return `path:${String(page.path || documentId(page))}`;
}

function pageLocaleValue(page: Record<string, unknown>) {
  return String(page.locale || page.language || "en").trim().toLowerCase() || "en";
}

function pageTranslationStatus(page: Record<string, unknown> | undefined) {
  if (!page) return "Missing";
  const status = statusLabel(String(page.status || "published")) || "Published";
  if (status.toLowerCase() === "published") return "Complete";
  return status;
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!isMongoConfigured()) {
    return {
      configured: false,
      counts: {
        pages: 0,
        blogPosts: 0,
        services: 0,
        tools: 0,
        drafts: 0,
        published: 0,
        missingTranslations: 0,
        missingSeoDescriptions: 0,
        missingAltText: 0,
        submissions: 0,
      },
      recentSubmissions: [],
      recentActivity: [],
      warnings: ["MongoDB is not configured yet. Add MONGODB_URI, run the seed command, then sign in."],
    };
  }

  const [pages, blogPosts, services, tools, formSubmissions, mediaAssets, auditLogs] = await Promise.all([
    mongoCollection<Record<string, unknown>>("pages"),
    mongoCollection<Record<string, unknown>>("blogPosts"),
    mongoCollection("services"),
    mongoCollection("tools"),
    mongoCollection("formSubmissions"),
    mongoCollection("mediaAssets"),
    mongoCollection<Record<string, unknown>>("auditLogs"),
  ]);
  const languageSettings = await getLanguageSettings();
  const languageCodes = activeLanguages(languageSettings).map((language) => language.code);
  const requiredLocaleCount = Math.max(1, languageCodes.length);
  const [
    pageCount,
    blogPostCount,
    servicesCount,
    toolsCount,
    formSubmissionsCount,
    publishedPages,
    publishedBlogPosts,
    missingPageTranslations,
    missingBlogTranslations,
    pagesMissingSeo,
    blogMissingSeo,
    mediaMissingAlt,
    recentAuditLogs,
    recentFormSubmissions,
  ] = await Promise.all([
    pages.countDocuments({}),
    blogPosts.countDocuments({}),
    services.countDocuments({}),
    tools.countDocuments({}),
    formSubmissions.countDocuments({ deletedAt: { $ne: true } }),
    pages.countDocuments({ status: "published" }),
    blogPosts.countDocuments({ status: "published", draft: { $ne: true } }),
    pages
      .aggregate<{ count: number }>([
        { $group: { _id: { $ifNull: ["$translationKey", { $ifNull: ["$translationGroup", "$path"] }] }, locales: { $addToSet: { $ifNull: ["$locale", "en"] } } } },
        { $project: { localeCount: { $size: "$locales" } } },
        { $match: { localeCount: { $lt: requiredLocaleCount } } },
        { $count: "count" },
      ])
      .toArray(),
    blogPosts
      .aggregate<{ count: number }>([
        { $group: { _id: { $ifNull: ["$translationGroup", "$slug"] }, locales: { $addToSet: { $ifNull: ["$language", { $ifNull: ["$locale", "en"] }] } } } },
        { $project: { localeCount: { $size: "$locales" } } },
        { $match: { localeCount: { $lt: requiredLocaleCount } } },
        { $count: "count" },
      ])
      .toArray(),
    pages.countDocuments(missingLocalizedObjectFilter("seo.description", languageCodes)),
    blogPosts.countDocuments(missingLocalizedObjectFilter("seo.description", languageCodes)),
    mediaAssets.countDocuments({ decorative: { $ne: true }, ...missingLocalizedObjectFilter("alt", languageCodes) }),
    auditLogs.find({}).sort({ createdAt: -1 }).limit(6).toArray(),
    formSubmissions.find({ deletedAt: { $ne: true } }).sort({ createdAt: -1 }).limit(8).toArray(),
  ]);
  const published = publishedPages + publishedBlogPosts;
  const drafts = pageCount + blogPostCount - published;
  const missingTranslations = Number(missingPageTranslations[0]?.count || 0) + Number(missingBlogTranslations[0]?.count || 0);
  const missingSeoDescriptions = pagesMissingSeo + blogMissingSeo;

  return {
    configured: true,
    counts: {
      pages: pageCount,
      blogPosts: blogPostCount,
      services: servicesCount,
      tools: toolsCount,
      drafts,
      published,
      missingTranslations,
      missingSeoDescriptions,
      missingAltText: mediaMissingAlt,
      submissions: formSubmissionsCount,
    },
    recentSubmissions: recentFormSubmissions.map((submission) => mapFormSubmission(submission as Record<string, unknown>)),
    recentActivity: recentAuditLogs.map((log) => ({
      id: documentId(log),
      title: String(log.entityName || log.entityType || "Activity"),
      description: String(log.action || ""),
      updatedAt: log.createdAt instanceof Date ? log.createdAt : null,
      meta: String(log.entityType || ""),
    })),
    warnings: [
      ...(missingTranslations ? [`${missingTranslations} content groups are missing a linked translation.`] : []),
      ...(missingSeoDescriptions ? [`${missingSeoDescriptions} content items need SEO descriptions.`] : []),
      ...(mediaMissingAlt ? [`${mediaMissingAlt} non-decorative media assets need alt text.`] : []),
    ],
  };
}

export async function getModuleRecords(
  slug: AdminModuleSlug,
  filters: { search?: string; language?: string; status?: string; page?: string } = {},
): Promise<{ title: string; description: string; records: AdminRecord[]; pageInfo: AdminPageInfo }> {
  const adminModule = getAdminModule(slug);
  if (!adminModule) throw new Error("Unknown admin module.");
  const pageSize = slug === "pages" ? 100 : 15;
  const requestedPage = Math.max(1, Number.parseInt(filters.page || "1", 10) || 1);
  const hasActiveFilters = Boolean(
    filters.search?.trim() || (filters.language && filters.language !== "all") || (filters.status && filters.status !== "all"),
  );
  const paginate = (total: number) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    return {
      page,
      totalPages,
      start: (page - 1) * pageSize,
    };
  };
  const buildResponse = (pageRecords: AdminRecord[], total: number) => {
    const page = paginate(total);
    return {
      title: adminModule.label,
      description: adminModule.description,
      records: pageRecords,
      pageInfo: {
        page: page.page,
        pageSize,
        total,
        totalPages: page.totalPages,
        hasPrevious: page.page > 1,
        hasNext: page.page < page.totalPages,
      },
    };
  };
  const readPagedDocuments = async <T extends Document>(collection: Collection<T>, projection: Document, sort: Sort) => {
    if (hasActiveFilters) {
      return {
        documents: await collection.find({}, { projection }).sort(sort).limit(250).toArray(),
        total: null,
      };
    }

    const requestedStart = (requestedPage - 1) * pageSize;
    const [total, documents] = await Promise.all([
      collection.countDocuments({}),
      collection.find({}, { projection }).sort(sort).skip(requestedStart).limit(pageSize).toArray(),
    ]);
    const page = paginate(total);
    if (page.start !== requestedStart && total > 0) {
      return {
        documents: await collection.find({}, { projection }).sort(sort).skip(page.start).limit(pageSize).toArray(),
        total,
      };
    }

    return { documents, total };
  };

  if (!isMongoConfigured()) {
    return buildResponse([], 0);
  }

  let records: AdminRecord[] = [];

  if (slug === "pages") {
    const collection = await mongoCollection<Record<string, unknown>>("pages");
    const pages = await collection.find({ deletedAt: { $ne: true } }, { projection: pageListProjection }).sort({ locale: 1, path: 1 }).limit(500).toArray();
    const grouped = new Map<string, Record<string, unknown>[]>();
    const languageSettings = await getLanguageSettings();
    const languages = activeLanguages(languageSettings);

    pages.forEach((page) => {
      const key = pageGroupKey(page);
      const group = grouped.get(key) || [];
      group.push(page);
      grouped.set(key, group);
    });

    records = Array.from(grouped.values())
      .map((group) => {
        const byLocale = new Map(group.map((page) => [pageLocaleValue(page), page]));
        const primary = byLocale.get(languageSettings.defaultLanguage) || group[0];
        const translations = languages.map((language) => {
          const translation = byLocale.get(language.code);
          return {
            locale: language.code,
            label: language.name || language.nativeName || language.code.toUpperCase(),
            status: pageTranslationStatus(translation),
            href: translation ? String(translation.path || "") : undefined,
            id: translation ? documentId(translation) : undefined,
          };
        });
        const missingCount = translations.filter((translation) => !translation.id).length;
        return {
          id: documentId(primary),
          title: String(primary.title || ""),
          description: String(primary.description || ""),
          status: missingCount ? "Needs translation" : "Complete",
          language: translations.map((translation) => `${translation.locale.toUpperCase()}: ${translation.status}`).join(", "),
          href: String(primary.path || ""),
          updatedAt: primary.updatedAt instanceof Date ? primary.updatedAt : null,
          meta: [
            pageAreaLabel(String(primary.path || "")),
            String(primary.category || ""),
            Array.isArray(primary.tags) && primary.tags.length ? `Tags: ${primary.tags.map(String).join(", ")}` : "",
          ]
            .filter(Boolean)
            .join(" - "),
          translations,
        } satisfies AdminRecord;
      })
      .sort((left, right) => pageSortRank(left.href || "") - pageSortRank(right.href || "") || (left.href || "").localeCompare(right.href || ""));
  } else if (slug === "blog") {
    const collection = await mongoCollection<Record<string, unknown>>("blogPosts");
    const { documents: posts, total } = await readPagedDocuments(collection, blogListProjection, { updatedAt: -1 });
    records = posts.map((post) => {
      const locale = String(post.language || post.locale || "en");
      const postSlug = String(post.slug || "");
      return {
        id: documentId(post),
        title: String(post.title || ""),
        description: String(post.excerpt || ""),
        status: statusLabel(String(post.status || (post.draft ? "draft" : "published"))),
        language: locale,
        href: locale === "el" ? `/el/seo-blog/${postSlug}/` : `/blog/${postSlug}/`,
        updatedAt: post.updatedAt instanceof Date ? post.updatedAt : null,
      };
    });
    if (total !== null) return buildResponse(records, total);
  } else if (slug === "services" || slug === "tools" || slug === "certificates" || slug === "faqs" || slug === "testimonials") {
    const collectionName = collectionModuleNames[slug] || slug;
    const collection = await mongoCollection<Record<string, unknown>>(collectionName);
    const { documents: items, total } = await readPagedDocuments(
      collection,
      {
        title: 1,
        name: 1,
        clientName: 1,
        question: 1,
        description: 1,
        answer: 1,
        quote: 1,
        issuer: 1,
        companyName: 1,
        active: 1,
        slug: 1,
        credentialUrl: 1,
        toolUrl: 1,
        displayOrder: 1,
        updatedAt: 1,
      },
      { displayOrder: 1, updatedAt: -1 },
    );
    records = items.map((item) => ({
      id: documentId(item),
      title: localized(item.title) || localized(item.question) || String(item.title || item.name || item.clientName || ""),
      description: localized(item.description) || localized(item.answer) || localized(item.quote) || String(item.issuer || item.companyName || ""),
      status: item.active === false ? "Hidden" : "Published",
      href: String(item.slug || item.credentialUrl || item.toolUrl || ""),
      updatedAt: item.updatedAt instanceof Date ? item.updatedAt : null,
    }));
    if (total !== null) return buildResponse(records, total);
  } else if (slug === "media") {
    const collection = await mongoCollection<Record<string, unknown>>("mediaAssets");
    const { documents: media, total } = await readPagedDocuments(
      collection,
      {
        title: 1,
        originalFileName: 1,
        fileName: 1,
        alt: 1,
        mimeType: 1,
        deletedAt: 1,
        url: 1,
        decorative: 1,
        updatedAt: 1,
      },
      { updatedAt: -1 },
    );
    records = media.map((asset) => ({
      id: documentId(asset),
      title: String(asset.title || asset.originalFileName || asset.fileName || ""),
      description: localized(asset.alt) || String(asset.mimeType || ""),
      status: asset.deletedAt ? "Deleted" : "Available",
      href: String(asset.url || ""),
      updatedAt: asset.updatedAt instanceof Date ? asset.updatedAt : null,
      meta: asset.decorative ? "Decorative" : "Alt text review",
    }));
    if (total !== null) return buildResponse(records, total);
  } else if (slug === "redirects") {
    const collection = await mongoCollection<Record<string, unknown>>("redirects");
    const { documents: redirects, total } = await readPagedDocuments(
      collection,
      { sourceUrl: 1, destinationUrl: 1, active: 1, permanent: 1, updatedAt: 1 },
      { updatedAt: -1 },
    );
    records = redirects.map((redirect) => ({
      id: documentId(redirect),
      title: String(redirect.sourceUrl || ""),
      description: String(redirect.destinationUrl || ""),
      status: redirect.active === false ? "Inactive" : "Active",
      meta: redirect.permanent === false ? "temporary redirect" : "permanent redirect",
      updatedAt: redirect.updatedAt instanceof Date ? redirect.updatedAt : null,
    }));
    if (total !== null) return buildResponse(records, total);
  } else if (slug === "forms") {
    const forms = await (await mongoCollection<Record<string, unknown>>("forms"))
      .find({}, { projection: { key: 1, title: 1, active: 1, updatedAt: 1 } })
      .sort({ updatedAt: -1 })
      .toArray();
    records = await Promise.all(
      forms.map(async (form) => ({
        id: documentId(form),
        title: localized(form.title) || String(form.key || "Form"),
        description: `${await (await mongoCollection("formSubmissions")).countDocuments({ formKey: form.key || "contact" })} submissions`,
        status: form.active === false ? "Hidden" : "Active",
        updatedAt: form.updatedAt instanceof Date ? form.updatedAt : null,
      })),
    );
  } else if (settingModuleKeys[slug]) {
    const settingKey = settingModuleKeys[slug];
    const setting = await (await mongoCollection<Record<string, unknown>>("settings")).findOne({ key: settingKey });
    records = [
      {
        id: setting ? documentId(setting) : "new",
        title: String(settingKey || adminModule.label),
        description: `${adminModule.label} settings`,
        status: setting ? "Active" : "Not configured",
      updatedAt: setting?.updatedAt instanceof Date ? setting.updatedAt : null,
      },
    ];
  } else if (slug === "users") {
    const collection = await mongoCollection<Record<string, unknown>>("users");
    const { documents: users, total } = await readPagedDocuments(
      collection,
      { name: 1, email: 1, status: 1, roles: 1, updatedAt: 1 },
      { updatedAt: -1 },
    );
    records = users.map((user) => ({
      id: documentId(user),
      title: String(user.name || ""),
      description: String(user.email || ""),
      status: statusLabel(String(user.status || "ACTIVE")),
      meta: Array.isArray(user.roles) ? user.roles.join(", ") : "",
      updatedAt: user.updatedAt instanceof Date ? user.updatedAt : null,
    }));
    if (total !== null) return buildResponse(records, total);
  } else if (slug === "audit-logs") {
    const collection = await mongoCollection<Record<string, unknown>>("auditLogs");
    const { documents: logs, total } = await readPagedDocuments(
      collection,
      { entityName: 1, entityType: 1, action: 1, createdAt: 1, userId: 1 },
      { createdAt: -1 },
    );
    records = logs.map((log) => ({
      id: documentId(log),
      title: String(log.entityName || log.entityType || "Activity"),
      description: String(log.action || ""),
      status: String(log.entityType || ""),
      updatedAt: log.createdAt instanceof Date ? log.createdAt : null,
      meta: String(log.userId || "System"),
    }));
    if (total !== null) return buildResponse(records, total);
  } else if (slug === "taxonomy") {
    const [categories, tags] = await Promise.all([
      (await mongoCollection<Record<string, unknown>>("categories"))
        .find({}, { projection: { name: 1, type: 1, active: 1, slug: 1, updatedAt: 1 } })
        .toArray(),
      (await mongoCollection<Record<string, unknown>>("tags"))
        .find({}, { projection: { name: 1, type: 1, active: 1, slug: 1, updatedAt: 1 } })
        .toArray(),
    ]);
    records = [
      ...categories.map((category) => ({
        id: documentId(category),
        title: localized(category.name) || String(category.name || ""),
        description: String(category.type || "Category"),
        status: category.active === false ? "Hidden" : "Active",
        href: String(category.slug || ""),
        updatedAt: category.updatedAt instanceof Date ? category.updatedAt : null,
        meta: "Category",
      })),
      ...tags.map((tag) => ({
        id: documentId(tag),
        title: localized(tag.name) || String(tag.name || ""),
        description: String(tag.type || "Tag"),
        status: tag.active === false ? "Hidden" : "Active",
        href: String(tag.slug || ""),
        updatedAt: tag.updatedAt instanceof Date ? tag.updatedAt : null,
        meta: "Tag",
      })),
    ];
  } else {
    records = [];
  }

  const filteredRecords = filterRecords(records, filters.search, filters.language, filters.status);
  const total = filteredRecords.length;
  const page = paginate(total);
  return buildResponse(filteredRecords.slice(page.start, page.start + pageSize), total);
}
