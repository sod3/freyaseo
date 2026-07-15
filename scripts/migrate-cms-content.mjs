import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = process.cwd();
const moduleCache = new Map();

function ensureDir(dir) {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
}

function writeJson(relPath, value) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeMdoc(relPath, frontmatter, body) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${body.trim()}\n`, "utf8");
}

function resolveModule(currentFile, request) {
  if (request.startsWith("@/")) {
    return path.join(root, request.slice(2));
  }
  if (request.startsWith(".")) {
    return path.resolve(path.dirname(currentFile), request);
  }
  return null;
}

function loadTs(relOrAbsPath) {
  let filename = path.isAbsolute(relOrAbsPath) ? relOrAbsPath : path.join(root, relOrAbsPath);
  if (!path.extname(filename)) {
    if (fs.existsSync(`${filename}.ts`)) filename = `${filename}.ts`;
    else filename = path.join(filename, "index.ts");
  }

  if (moduleCache.has(filename)) return moduleCache.get(filename);

  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
    fileName: filename,
  }).outputText;

  const cjsModule = { exports: {} };
  moduleCache.set(filename, cjsModule.exports);

  const localRequire = (request) => {
    if (request === "lucide-react") {
      return new Proxy(
        {},
        {
          get: (_target, prop) => ({ __icon: String(prop) }),
        },
      );
    }
    const resolved = resolveModule(filename, request);
    if (resolved) return loadTs(resolved);
    return {};
  };

  vm.runInNewContext(
    output,
    {
      module: cjsModule,
      exports: cjsModule.exports,
      require: localRequire,
      console,
      process,
      URL,
    },
    { filename },
  );

  return cjsModule.exports;
}

function slugify(value, fallback = "item") {
  const ascii = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (ascii) return ascii.slice(0, 90);
  return fallback;
}

function hash(value) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function localized(locale, value) {
  return locale === "el" ? { en: "", el: value || "" } : { en: value || "", el: "" };
}

function both(en = "", el = "") {
  return { en, el };
}

function pathLocale(pathname) {
  return pathname.startsWith("/el/") ? "el" : "en";
}

function imageAttrs(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([a-zA-Z:-]+)=["']([^"']*)["']/g)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function markdownFromArticle(post) {
  return post.content
    .flatMap((section) => [
      `## ${section.heading}`,
      "",
      ...section.body.flatMap((paragraph) => [paragraph, ""]),
    ])
    .join("\n");
}

const { wpClonePages } = loadTs("src/content/wp-clone/pages.ts");
const { routeMap } = loadTs("src/content/route-map.ts");
const servicesContent = loadTs("src/content/services.ts");
const { blogPostsEn } = loadTs("src/content/blog/en.ts");
const { blogPostsEl } = loadTs("src/content/blog/el.ts");
const { certificates } = loadTs("src/content/certificates.ts");
const { navigation } = loadTs("src/content/navigation.ts");
const { homeEn } = loadTs("src/content/pages/home.en.ts");
const { homeEl } = loadTs("src/content/pages/home.el.ts");

[
  "content/cms/pages",
  "content/cms/settings",
  "content/cms/services",
  "content/cms/tools",
  "content/cms/tool-categories",
  "content/cms/blog-posts",
  "content/cms/blog-categories",
  "content/cms/tags",
  "content/cms/media-assets",
  "content/cms/certificates",
  "content/cms/faqs",
  "content/cms/testimonials",
  "content/cms/authors",
  "content/cms/redirects",
].forEach(ensureDir);

for (const [key, page] of Object.entries(wpClonePages)) {
  writeJson(`content/cms/pages/${key}.json`, {
    entryTitle: page.title,
    title: page.title,
    path: page.path,
    locale: page.locale,
    status: "published",
    translationKey: key.replace(/^(en|el)_/, ""),
    translatedPage: null,
    alternatePath: routeMap?.[page.path] || "",
    showInNavigation: [
      "/",
      "/seo-marketing/",
      "/certificates/",
      "/about/",
      "/blog/",
      "/contact-2/",
      "/el/seo-agency/",
      "/el/seo-marketing-2/",
      "/el/certificates-seo/",
      "/el/about-us/",
      "/el/seo-blog/",
      "/el/lets-contact/",
    ].includes(page.path),
    navigationOrder: 0,
    featuredImage: null,
    tags: [],
    description: page.description,
    bodyClass: page.bodyClass,
    renderMode: "wordpressHtml",
    html: page.html,
    sections: [
      {
        discriminant: "htmlSnapshot",
        value: {
          enabled: true,
          html: page.html,
        },
      },
    ],
    seo: {
      title: localized(page.locale, page.title),
      description: localized(page.locale, page.description),
      focusKeyword: "",
      secondaryKeywords: [],
      canonicalUrl: page.path,
      robotsIndex: true,
      robotsFollow: true,
      archive: true,
      snippet: true,
      openGraphTitle: localized(page.locale, page.title),
      openGraphDescription: localized(page.locale, page.description),
      openGraphImage: null,
      openGraphImageAlt: localized(page.locale, "Freya SEO"),
      twitterTitle: localized(page.locale, page.title),
      twitterDescription: localized(page.locale, page.description),
      twitterImage: null,
      twitterCardType: "summary_large_image",
      breadcrumbTitle: localized(page.locale, page.title),
      schemaType: page.path.includes("/category/") ? "CollectionPage" : "WebPage",
      publishDate: "2026-07-14",
      modifiedDate: "2026-07-14",
      author: "Pavlina Hörmann",
      redirectUrl: "",
      customMeta: [],
    },
  });
}

const navItems = navigation.en.primary.map((item, index) => {
  const greek = navigation.el.primary[index] || item;
  const children = item.href === "/"
    ? []
    : item.label === "Blog"
      ? [
          { label: both("AI SEO", "AI SEO"), url: "/ai-seo/", target: "_self", nofollow: false },
          { label: both("SEO Tips", "SEO Tips"), url: "/seo-tips/", target: "_self", nofollow: false },
        ]
      : item.label === "Main Page"
        ? []
        : item.label === "SEO Certificates"
          ? []
          : item.label === "About"
            ? []
            : [];

  return {
    label: both(item.label, greek.label),
    mobileLabel: both(item.label, greek.label),
    href: item.href,
    target: "_self",
    visibleInEnglish: true,
    visibleInGreek: true,
    order: index + 1,
    children,
  };
});

navItems.splice(1, 0, {
  label: both(navigation.en.services, navigation.el.services),
  mobileLabel: both(navigation.en.services, navigation.el.services),
  href: "/seo-marketing/",
  target: "_self",
  visibleInEnglish: true,
  visibleInGreek: true,
  order: 2,
  children: navigation.en.serviceItems.map((item, index) => ({
    label: both(item.title, navigation.el.serviceItems[index]?.title || item.title),
    url: item.href,
    target: "_self",
    nofollow: false,
  })),
});

writeJson("content/cms/settings/navigation.json", { items: navItems });

writeJson("content/cms/settings/site-settings.json", {
  websiteName: "Freya SEO",
  defaultTitle: "Rank First on Google & AI | Multilingual SEO Agency - FreyaSEO",
  description:
    "Freya SEO is an SEO agency specializing in SEO for AI search and multilingual SEO, helping businesses rank higher and grow in global markets.",
  primaryDomain: "https://www.freyaseo.com",
  englishLogo: null,
  greekLogo: null,
  mobileLogo: null,
  favicon: null,
  appleTouchIcon: null,
  defaultSocialImage: null,
  businessName: "Freya SEO",
  businessEmail: "",
  phoneNumber: "",
  whatsAppNumber: "",
  address: "",
  workingHours: both("", ""),
  socialLinks: [
    { label: both("Instagram", "Instagram"), url: "https://www.instagram.com/freyaseo", target: "_blank", nofollow: false },
    { label: both("LinkedIn", "LinkedIn"), url: "https://www.linkedin.com/company/freya-seo", target: "_blank", nofollow: false },
  ],
  copyrightText: both("© Freya SEO. All rights reserved.", "© Freya SEO. All rights reserved."),
  defaultCtaLabel: both("Free SEO Check", "Δωρεάν SEO Έλεγχος"),
  defaultCtaUrl: "/contact-2/",
  maintenanceMode: false,
  announcementBarText: both(homeEn.announcement, homeEl.announcement),
  announcementBarVisible: false,
  defaultLanguage: "en",
  availableLanguages: ["en", "el"],
  contactFormRecipient: "",
  formSuccessMessage: both("Thank you. Your message is ready to send.", "Ευχαριστούμε. Το μήνυμά σας είναι έτοιμο για αποστολή."),
  formErrorMessage: both("Please check the form and try again.", "Παρακαλώ ελέγξτε τη φόρμα και δοκιμάστε ξανά."),
});

writeJson("content/cms/settings/footer.json", {
  logo: null,
  description: both(
    "Freya SEO helps businesses improve visibility across Google, AI search and organic growth channels.",
    "Η Freya SEO βοηθά επιχειρήσεις να βελτιώσουν την ορατότητά τους σε Google, AI search και οργανικά κανάλια.",
  ),
  quickLinks: [
    { label: both("About", "Σχετικά"), url: "/about/", target: "_self", nofollow: false },
    { label: both("Contact", "Επικοινωνία"), url: "/contact-2/", target: "_self", nofollow: false },
    { label: both("Blog", "Blog"), url: "/blog/", target: "_self", nofollow: false },
  ],
  serviceLinks: navigation.en.serviceItems.map((item, index) => ({
    label: both(item.title, navigation.el.serviceItems[index]?.title || item.title),
    url: item.href,
    target: "_self",
    nofollow: false,
  })),
  legalLinks: [],
  socialLinks: [
    { label: both("Instagram", "Instagram"), url: "https://www.instagram.com/freyaseo", target: "_blank", nofollow: false },
    { label: both("LinkedIn", "LinkedIn"), url: "https://www.linkedin.com/company/freya-seo", target: "_blank", nofollow: false },
  ],
  email: "",
  phone: "",
  address: "",
  copyright: both("© Freya SEO. All rights reserved.", "© Freya SEO. All rights reserved."),
});

writeJson("content/cms/settings/seo.json", {
  defaults: {
    title: both("Rank First on Google & AI | Multilingual SEO Agency - Freya SEO", "Εταιρεία SEO για Google & AI | Freya SEO"),
    description: both(
      "Freya SEO builds AI-powered SEO, automation, reporting and custom tools for businesses that want measurable organic growth.",
      "Η Freya SEO δημιουργεί AI-powered SEO, αυτοματισμούς, αναφορές και custom εργαλεία για μετρήσιμη οργανική ανάπτυξη.",
    ),
    focusKeyword: "",
    secondaryKeywords: [],
    canonicalUrl: "",
    robotsIndex: true,
    robotsFollow: true,
    archive: true,
    snippet: true,
    openGraphTitle: both("Freya SEO", "Freya SEO"),
    openGraphDescription: both("", ""),
    openGraphImage: null,
    openGraphImageAlt: both("Freya SEO", "Freya SEO"),
    twitterTitle: both("Freya SEO", "Freya SEO"),
    twitterDescription: both("", ""),
    twitterImage: null,
    twitterCardType: "summary_large_image",
    breadcrumbTitle: both("Freya SEO", "Freya SEO"),
    schemaType: "WebPage",
    publishDate: "2026-07-14",
    modifiedDate: "2026-07-14",
    author: "Pavlina Hörmann",
    redirectUrl: "",
    customMeta: [],
  },
  organizationSchemaEnabled: true,
  professionalServiceSchemaEnabled: true,
  websiteSchemaEnabled: true,
  breadcrumbSchemaEnabled: true,
});

writeJson("content/cms/settings/marketing.json", {
  ga4MeasurementId: "",
  gtmContainerId: "",
  searchConsoleVerification: "",
  googleAdsConversionId: "",
  googleAdsConversionLabel: "",
  googleMapsEmbedUrl: "",
  recaptchaSiteKey: "",
  bingWebmasterVerification: "",
  metaPixelId: "",
  linkedInInsightTagId: "",
  cookieConsentEnabled: false,
  cookieConsentText: both("", ""),
  privacyPolicyUrl: "",
});

writeJson("content/cms/settings/contact.json", {
  title: both("Let's talk about your project", "Ας μιλήσουμε για το project σας"),
  description: both("", ""),
  fields: [
    { name: "name-1", label: both("First Name", "Όνομα"), placeholder: both("", ""), required: true },
    { name: "email-1", label: both("Email Address", "Διεύθυνση Email"), placeholder: both("", ""), required: true },
    { name: "textarea-1", label: both("Message", "Μήνυμα"), placeholder: both("", ""), required: true },
  ],
  submitButtonText: both("Submit", "Αποστολή"),
  successMessage: both("Thank you. Your message is ready to send.", "Ευχαριστούμε. Το μήνυμά σας είναι έτοιμο για αποστολή."),
  errorMessage: both("This field is required.", "Το πεδίο είναι υποχρεωτικό."),
  recipientEmail: "",
  consentCheckboxText: both("", ""),
  privacyPolicyLink: "",
});

const servicePages = servicesContent.servicePages;
const serviceKeys = Object.keys(servicePages.en);
const toolMap = new Map();

writeJson("content/cms/tool-categories/seo-tools.json", {
  name: "SEO Tools",
  greekName: "Εργαλεία SEO",
  description: both("Tools used across SEO, reporting, automation and custom systems.", ""),
  language: "en",
  active: true,
  seo: { title: both("SEO Tools", ""), description: both("", ""), robotsIndex: false, robotsFollow: true },
});

for (const key of serviceKeys) {
  const en = servicePages.en[key];
  const el = servicePages.el[key];
  for (const tool of [...(en.tools || []), ...(el.tools || [])]) {
    if (tool?.name) toolMap.set(tool.name, tool);
  }

  writeJson(`content/cms/services/${key}.json`, {
    title: en.title,
    greekTitle: el.title,
    greekSlug: el.href,
    language: "en",
    shortDescription: both(en.description, el.description),
    fullDescription: both([en.intro, en.outcome].filter(Boolean).join("\n\n"), [el.intro, el.outcome].filter(Boolean).join("\n\n")),
    icon: key,
    featuredImage: null,
    tools: (en.tools || []).map((tool) => slugify(tool.name)),
    faqs: [],
    tags: [slugify(en.eyebrow || key)],
    displayOrder: serviceKeys.indexOf(key) + 1,
    active: true,
    seo: {
      title: both(en.seoTitle, el.seoTitle),
      description: both(en.metaDescription, el.metaDescription),
      canonicalUrl: en.href,
      robotsIndex: true,
      robotsFollow: true,
      schemaType: "Service",
      author: "Pavlina Hörmann",
      customMeta: [],
    },
  });
}

for (const [name, tool] of toolMap) {
  writeJson(`content/cms/tools/${slugify(name)}.json`, {
    name,
    englishName: name,
    greekName: name,
    shortDescription: both("", ""),
    fullDescription: both("", ""),
    logo: null,
    existingLogoPath: tool.logo || "",
    logoAlt: both(tool.alt || `${name} logo`, tool.alt || `${name} logo`),
    logoTitle: name,
    imageCaption: both("", ""),
    category: "seo-tools",
    tags: [],
    toolUrl: "",
    hasInternalDetailPage: false,
    featured: false,
    displayOrder: Array.from(toolMap.keys()).indexOf(name) + 1,
    publishDate: "2026-07-14",
    updatedDate: "2026-07-14",
    active: true,
    newBadge: false,
    featuredBadge: false,
    relatedServices: [],
    seo: {
      title: both(name, name),
      description: both("", ""),
      robotsIndex: true,
      robotsFollow: true,
      schemaType: "WebPage",
      customMeta: [],
    },
  });
}

const blogPosts = [...blogPostsEn, ...blogPostsEl];
const categoryMap = new Map();

for (const post of blogPosts) {
  const categorySlug = slugify(post.category);
  categoryMap.set(categorySlug, post.category);
  writeMdoc(
    `content/cms/blog-posts/${post.slug}.mdoc`,
    {
      title: post.title,
      language: post.locale,
      translationGroup: post.slug,
      translatedPost: null,
      excerpt: post.excerpt,
      legacySections: post.content,
      featuredImage: null,
      existingImagePath: post.image,
      featuredImageAlt: localized(post.locale, post.imageAlt),
      featuredImageTitle: post.title,
      featuredImageCaption: localized(post.locale, ""),
      author: "pavlina-hormann",
      authorName: post.author,
      category: categorySlug,
      categoryName: post.category,
      tags: [categorySlug],
      featured: false,
      publishedDate: post.publicationDate,
      updatedDate: post.publicationDate,
      readingTime: post.readingTime,
      draft: false,
      relatedPosts: [],
      cta: { label: both("", ""), url: "", target: "_self", nofollow: false },
      seo: {
        title: localized(post.locale, post.seoTitle),
        description: localized(post.locale, post.metaDescription),
        canonicalUrl: post.locale === "el" ? `/el/seo-blog/${post.slug}/` : `/blog/${post.slug}/`,
        robotsIndex: true,
        robotsFollow: true,
        schemaType: "BlogPosting",
        publishDate: post.publicationDate,
        modifiedDate: post.publicationDate,
        author: post.author,
        customMeta: [],
      },
    },
    markdownFromArticle(post),
  );
}

for (const [slug, name] of categoryMap) {
  writeJson(`content/cms/blog-categories/${slug}.json`, {
    name,
    greekName: name,
    description: both("", ""),
    language: "en",
    indexArchive: true,
    seo: { title: both(name, name), description: both("", ""), robotsIndex: true, robotsFollow: true, customMeta: [] },
  });
  writeJson(`content/cms/tags/${slug}.json`, {
    name,
    greekName: name,
    description: both("", ""),
    language: "en",
    indexArchive: true,
    seo: { title: both(name, name), description: both("", ""), robotsIndex: true, robotsFollow: true, customMeta: [] },
  });
}

writeJson("content/cms/authors/pavlina-hormann.json", {
  name: "Pavlina Hörmann",
  role: both("SEO Manager and AI Marketer", "SEO Manager και AI Marketer"),
  bio: both("", ""),
  image: null,
  imageAlt: both("Pavlina Hörmann", "Pavlina Hörmann"),
  active: true,
  seo: { title: both("Pavlina Hörmann", "Pavlina Hörmann"), description: both("", ""), robotsIndex: true, robotsFollow: true, customMeta: [] },
});

certificates.forEach((certificate, index) => {
  writeJson(`content/cms/certificates/${slugify(certificate.title, `certificate-${index + 1}`)}.json`, {
    title: certificate.title,
    issuer: certificate.issuer,
    image: null,
    imageAlt: both(certificate.title, certificate.title),
    credentialUrl: certificate.verificationUrl || "",
    issueDate: `${certificate.date || "2026"}-01-01`,
    expiryDate: null,
    description: both(certificate.category || "", certificate.category || ""),
    tags: [slugify(certificate.category || "certificate")],
    displayOrder: index + 1,
    active: true,
  });
});

const faqs = [
  ...homeEn.faq.items.map((item, index) => ({ locale: "en", service: "", index, ...item })),
  ...homeEl.faq.items.map((item, index) => ({ locale: "el", service: "", index, ...item })),
];

for (const key of serviceKeys) {
  for (const locale of ["en", "el"]) {
    const page = servicePages[locale][key];
    for (const [index, item] of (page.faq || []).entries()) {
      faqs.push({ locale, service: key, index, question: item.question, answer: item.answer });
    }
  }
}

faqs.forEach((faq, index) => {
  const slug = `${faq.locale}-${slugify(faq.question, `faq-${index + 1}`)}-${index + 1}`;
  writeJson(`content/cms/faqs/${slug}.json`, {
    question: faq.question,
    greekQuestion: faq.locale === "el" ? faq.question : "",
    answer: localized(faq.locale, faq.answer),
    category: faq.service || "General",
    relatedService: faq.service || null,
    relatedPage: null,
    tags: [],
    displayOrder: index + 1,
    active: true,
  });
});

const media = new Map();
for (const page of Object.values(wpClonePages)) {
  for (const match of page.html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = imageAttrs(match[0]);
    const src = attrs.src || "";
    if (!src || src.startsWith("data:")) continue;
    const key = src;
    const existing = media.get(key) || {
      src,
      title: path.basename(src).replace(/\.[^.]+$/, ""),
      alt: { en: "", el: "" },
      caption: { en: "", el: "" },
      description: { en: "", el: "" },
      width: attrs.width ? Number(attrs.width) : null,
      height: attrs.height ? Number(attrs.height) : null,
      fileType: path.extname(src).replace(".", ""),
      decorative: true,
    };
    const locale = page.locale || pathLocale(page.path);
    if (attrs.alt) {
      existing.alt[locale] = attrs.alt;
      existing.decorative = false;
    }
    media.set(key, existing);
  }
}

for (const item of media.values()) {
  writeJson(`content/cms/media-assets/${slugify(item.title, `media-${hash(item.src)}`)}-${hash(item.src)}.json`, {
    title: item.title,
    metadata: {
      image: null,
      title: item.title,
      alt: item.alt,
      caption: item.caption,
      description: item.description,
      credit: "",
      copyright: "",
      decorative: item.decorative,
      preferredUsage: "Existing website image",
      width: item.width,
      height: item.height,
      fileType: item.fileType,
      externalSourceUrl: item.src,
      tags: [],
    },
  });
}

writeJson("content/cms/redirects/backlinks-to-category.json", {
  name: "Backlinks legacy category",
  sourceUrl: "/backlinks/",
  destinationUrl: "/category/backlinks/",
  permanent: true,
  active: true,
  notes: "Preserves the legacy link normalization already used by the frontend behavior script.",
});

writeJson("content/cms/redirects/content-marketing-to-category.json", {
  name: "Content Marketing legacy category",
  sourceUrl: "/content-marketing/",
  destinationUrl: "/category/content-marketing/",
  permanent: true,
  active: true,
  notes: "Preserves the legacy link normalization already used by the frontend behavior script.",
});

console.log(`Migrated ${Object.keys(wpClonePages).length} pages, ${toolMap.size} tools, ${blogPosts.length} blog posts, ${media.size} media assets.`);
