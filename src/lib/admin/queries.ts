import type { Collection, Document, Sort } from "mongodb";
import { documentId, isMongoConfigured, mongoCollection } from "@/src/lib/mongo";
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
  recentActivity: AdminRecord[];
  warnings: string[];
};

export type AdminPageInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

function localized(value: unknown, preferred: "en" | "el" = "en") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const copy = value as Partial<Record<"en" | "el", string>>;
  return copy[preferred] || copy.en || copy.el || "";
}

function statusLabel(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

function filterRecords(records: AdminRecord[], search?: string, language?: string, status?: string) {
  const term = search?.trim().toLowerCase();
  return records.filter((record) => {
    if (term && !`${record.title} ${record.description || ""} ${record.href || ""}`.toLowerCase().includes(term)) return false;
    if (language && language !== "all" && record.language !== language) return false;
    if (status && status !== "all" && record.status?.toLowerCase() !== status.toLowerCase()) return false;
    return true;
  });
}

const pageListProjection = {
  title: 1,
  description: 1,
  status: 1,
  locale: 1,
  path: 1,
  sourceSlug: 1,
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

function missingLocalizedObjectFilter(field: string) {
  return {
    $and: [
      { $or: [{ [`${field}.en`]: { $exists: false } }, { [`${field}.en`]: "" }] },
      { $or: [{ [`${field}.el`]: { $exists: false } }, { [`${field}.el`]: "" }] },
    ],
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
        { $match: { localeCount: { $lt: 2 } } },
        { $count: "count" },
      ])
      .toArray(),
    blogPosts
      .aggregate<{ count: number }>([
        { $group: { _id: { $ifNull: ["$translationGroup", "$slug"] }, locales: { $addToSet: { $ifNull: ["$language", { $ifNull: ["$locale", "en"] }] } } } },
        { $project: { localeCount: { $size: "$locales" } } },
        { $match: { localeCount: { $lt: 2 } } },
        { $count: "count" },
      ])
      .toArray(),
    pages.countDocuments(missingLocalizedObjectFilter("seo.description")),
    blogPosts.countDocuments(missingLocalizedObjectFilter("seo.description")),
    mediaAssets.countDocuments({ decorative: { $ne: true }, ...missingLocalizedObjectFilter("alt") }),
    auditLogs.find({}).sort({ createdAt: -1 }).limit(6).toArray(),
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
    const { documents: pages, total } = await readPagedDocuments(collection, pageListProjection, { locale: 1, path: 1 });
    records = pages.map((page) => ({
      id: documentId(page),
      title: String(page.title || ""),
      description: String(page.description || ""),
      status: statusLabel(String(page.status || "published")),
      language: String(page.locale || ""),
      href: String(page.path || ""),
      updatedAt: page.updatedAt instanceof Date ? page.updatedAt : null,
      meta: [
        pageAreaLabel(String(page.path || "")),
        String(page.category || ""),
        Array.isArray(page.tags) && page.tags.length ? `Tags: ${page.tags.map(String).join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" - "),
    })).sort((left, right) => pageSortRank(left.href || "") - pageSortRank(right.href || "") || (left.href || "").localeCompare(right.href || ""));
    if (total !== null) return buildResponse(records, total);
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
