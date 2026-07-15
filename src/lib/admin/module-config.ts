import type { AdminModuleSlug } from "./modules";

type JsonObject = Record<string, unknown>;

export const collectionModuleNames: Partial<Record<AdminModuleSlug, string>> = {
  services: "services",
  tools: "tools",
  certificates: "certificates",
  faqs: "faqs",
  testimonials: "testimonials",
  media: "mediaAssets",
  redirects: "redirects",
  forms: "forms",
};

export const settingModuleKeys: Partial<Record<AdminModuleSlug, string>> = {
  navigation: "navigation",
  footer: "footer",
  seo: "seo",
  "google-integrations": "marketing",
  settings: "site-settings",
};

export const editableCmsModules = new Set<AdminModuleSlug>([
  "pages",
  "blog",
  "services",
  "tools",
  "certificates",
  "faqs",
  "testimonials",
  "media",
  "navigation",
  "footer",
  "seo",
  "google-integrations",
  "redirects",
  "forms",
  "settings",
]);

export const creatableCmsModules = new Set<AdminModuleSlug>([
  "pages",
  "blog",
  "services",
  "tools",
  "certificates",
  "faqs",
  "testimonials",
  "redirects",
  "forms",
]);

export function writePermissionForModule(module: AdminModuleSlug) {
  if (module === "seo") return "seo.write";
  if (module === "google-integrations" || module === "settings") return "settings.manage";
  if (module === "media") return "media.write";
  if (module === "forms") return "forms.read";
  return "content.write";
}

export function getModuleStorage(module: AdminModuleSlug) {
  return {
    collectionName: collectionModuleNames[module],
    settingKey: settingModuleKeys[module],
  };
}

export function revalidationPathsForModule(module: AdminModuleSlug) {
  if (module === "navigation" || module === "footer" || module === "seo" || module === "google-integrations" || module === "settings") {
    return ["/", "/sitemap.xml", "/robots.txt"];
  }
  if (module === "forms") return ["/contact-2/", "/el/lets-contact/"];
  if (module === "blog") return ["/blog/", "/el/seo-blog/"];
  if (module === "services" || module === "tools") {
    return ["/seo-marketing/", "/tool-generation/", "/el/seo-marketing-2/", "/el/tool-generation-2/"];
  }
  if (module === "certificates") return ["/certificates/", "/el/certificates-seo/"];
  return ["/"];
}

export function defaultJsonForModule(module: AdminModuleSlug): JsonObject {
  if (module === "services") {
    return {
      slug: "new-service",
      title: { en: "New service", el: "" },
      description: { en: "", el: "" },
      active: true,
      displayOrder: 0,
      seo: {
        title: { en: "New service", el: "" },
        description: { en: "", el: "" },
        robotsIndex: true,
        robotsFollow: true,
      },
    };
  }

  if (module === "tools") {
    return {
      name: "New tool",
      englishName: "New tool",
      greekName: "",
      shortDescription: { en: "", el: "" },
      category: "seo-tools",
      existingLogoPath: "",
      active: true,
      displayOrder: 0,
    };
  }

  if (module === "certificates") {
    return {
      title: "New certificate",
      issuer: "",
      category: "",
      credentialUrl: "",
      active: true,
      displayOrder: 0,
    };
  }

  if (module === "faqs") {
    return {
      question: { en: "New question", el: "" },
      answer: { en: "", el: "" },
      active: true,
      displayOrder: 0,
    };
  }

  if (module === "testimonials") {
    return {
      clientName: "",
      companyName: "",
      quote: { en: "", el: "" },
      active: true,
      displayOrder: 0,
    };
  }

  if (module === "redirects") {
    return {
      sourceUrl: "/old-url/",
      destinationUrl: "/new-url/",
      permanent: true,
      active: true,
      notes: "",
    };
  }

  if (module === "forms") {
    return {
      key: "new-form",
      title: { en: "New form", el: "" },
      description: { en: "", el: "" },
      fields: [],
      submitLabel: { en: "Submit", el: "" },
      successMessage: { en: "Thank you.", el: "" },
      errorMessage: { en: "Please check the form.", el: "" },
      active: true,
    };
  }

  return {};
}
