"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAlternatePath, normalizePath, serviceRoutes } from "@/src/content/route-map";

type ServiceMenuItem = {
  label: string;
  href: string;
};

type BuiltInLocale = "en" | "el";

type LanguageOption = {
  code: string;
  label: string;
  shortLabel: string;
  flagEmoji?: string;
  href: string;
  current: boolean;
};

const legacyRouteFixes: Record<string, string> = {
  "/backlinks/": "/category/backlinks/",
  "/content-marketing/": "/category/content-marketing/",
};

const serviceLabels: Record<BuiltInLocale, Record<(typeof serviceRoutes)[number]["key"], string>> = {
  en: {
    aiSeo: "AI SEO",
    automation: "Automation",
    reporting: "Report",
    toolGeneration: "Tool Generation",
  },
  el: {
    aiSeo: "AI SEO",
    automation: "Automation",
    reporting: "Report",
    toolGeneration: "Tool Generation",
  },
};

const greekMainNavigation = new Map([
  ["/el/seo-agency/", "Main Page"],
  ["/el/seo-marketing-2/", "Services"],
  ["/el/certificates-seo/", "SEO Certificates"],
  ["/el/about-us/", "About"],
  ["/el/seo-blog/", "Blog"],
  ["/el/lets-contact/", "Contact"],
]);

const serviceLabelKeys = new Map<string, (typeof serviceRoutes)[number]["key"]>([
  ["ai seo", "aiSeo"],
  ["automation", "automation"],
  ["automations", "automation"],
  ["report", "reporting"],
  ["reporting", "reporting"],
  ["tool generation", "toolGeneration"],
  ["\u03b1\u03c5\u03c4\u03bf\u03bc\u03b1\u03c4\u03b9\u03c3\u03bc\u03bf\u03af", "automation"],
  ["\u03b1\u03c5\u03c4\u03bf\u03bc\u03b1\u03c4\u03b9\u03c3\u03bc\u03bf\u03c2", "automation"],
  ["\u03b1\u03bd\u03b1\u03c6\u03bf\u03c1\u03ad\u03c2", "reporting"],
  ["\u03b1\u03bd\u03b1\u03c6\u03bf\u03c1\u03ac", "reporting"],
  ["\u03b4\u03b7\u03bc\u03b9\u03bf\u03c5\u03c1\u03b3\u03af\u03b1 \u03b5\u03c1\u03b3\u03b1\u03bb\u03b5\u03af\u03c9\u03bd", "toolGeneration"],
]);

const formCopy = {
  en: {
    name: "First Name",
    email: "Email Address",
    message: "Message",
    submit: "Submit",
    required: "This field is required.",
    emailInvalid: "Please enter a valid email address.",
    success: "Thank you. Your message is ready to send.",
    sending: "Sending...",
  },
  el: {
    name: "Όνομα",
    email: "Διεύθυνση Email",
    message: "Μήνυμα",
    submit: "Αποστολή",
    required: "Το πεδίο είναι υποχρεωτικό.",
    emailInvalid: "Παρακαλώ εισαγάγετε έγκυρη διεύθυνση email.",
    success: "Ευχαριστούμε. Το μήνυμά σας είναι έτοιμο για αποστολή.",
    sending: "Αποστολή...",
  },
} satisfies Record<BuiltInLocale, Record<string, string>>;

function builtInLocale(locale: string): BuiltInLocale {
  return locale === "el" ? "el" : "en";
}

function localizedServiceMenu(locale: string): ServiceMenuItem[] {
  const contentLocale = builtInLocale(locale);
  return serviceRoutes.map((service) => ({
    label: serviceLabels[contentLocale][service.key],
    href: service[contentLocale],
  }));
}

function normalizedLabel(value: string | null | undefined) {
  return (value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function serviceKeyForLabel(value: string | null | undefined) {
  return serviceLabelKeys.get(normalizedLabel(value));
}

function setNavigationLinkLabel(link: HTMLAnchorElement, label: string) {
  const labelElement = link.querySelector<HTMLElement>(".elementskit-menu-title, .menu-link-text, .nav-link-text");
  if (labelElement) {
    labelElement.textContent = label;
    return;
  }

  const textNode = Array.from(link.childNodes).find(
    (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  );
  if (textNode) {
    textNode.textContent = `${label} `;
    return;
  }

  link.insertAdjacentText("afterbegin", `${label} `);
}

function ensureGreekMainNavigation(root: HTMLElement, locale: string) {
  if (builtInLocale(locale) !== "el") return;

  root.querySelectorAll<HTMLAnchorElement>(".site-header .elementskit-navbar-nav > li > a[href]").forEach((link) => {
    const href = normalizeHref(link.getAttribute("href"), "el");
    if (!href) return;
    let pathname = "";
    try {
      pathname = normalizePath(new URL(href, window.location.origin).pathname);
    } catch {
      return;
    }
    const label = greekMainNavigation.get(pathname);
    if (label) setNavigationLinkLabel(link, label);
  });
}

function removeFrenchUi(root: HTMLElement) {
  const uiRoots = root.querySelectorAll<HTMLElement>(
    ".site-header, #site-footer, .elementskit-menu-container, .language-switcher, .pll-switcher-select",
  );
  uiRoots.forEach((uiRoot) => {
    uiRoot
      .querySelectorAll<HTMLElement>(
        ".lang-item-fr, [hreflang='fr'], [hreflang^='fr-'], [lang='fr'], [lang^='fr-'], a[href*='/fr/'], a[href*='lang=fr']",
      )
      .forEach((item) => (item.closest("li") || item).remove());
  });
}

function prepareHomepageHeroRotation(root: HTMLElement, pagePath: string, locale: string) {
  const normalized = normalizePath(pagePath);
  if (normalized !== "/" && normalized !== "/el/seo-agency/") return () => {};

  const list = Array.from(root.querySelectorAll<HTMLElement>(".ekit-fancy-text-lists")).find((candidate) => {
    if (candidate.closest("#site-footer")) return false;
    const text = normalizedLabel(candidate.textContent);
    return text.includes("google") && text.includes("ai");
  });
  if (!list || list.dataset.freyaRotatorPrepared === "true") return () => {};

  const items = Array.from(list.querySelectorAll<HTMLElement>("b")).slice(0, 2);
  if (items.length < 2) return () => {};

  const isGreek = builtInLocale(locale) === "el";
  items[0].textContent = isGreek ? "στο Google" : "#1 on Google";
  items[1].textContent = isGreek ? "στο AI" : "#1 on AI";
  items.forEach((item, index) => {
    item.classList.add("freya-hero-rotator-item");
    item.classList.toggle("is-active", index === 0);
    item.setAttribute("aria-hidden", String(index !== 0));
  });
  list.classList.add("freya-hero-rotator");
  list.dataset.freyaRotatorPrepared = "true";
  list.setAttribute("aria-live", "polite");
  list.setAttribute("aria-atomic", "true");

  let activeIndex = 0;
  const timer = window.setInterval(() => {
    activeIndex = (activeIndex + 1) % items.length;
    items.forEach((item, index) => {
      const active = index === activeIndex;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-hidden", String(!active));
    });
  }, 3200);

  return () => window.clearInterval(timer);
}

function prepareSeeServicesCta(root: HTMLElement, locale: string, pagePath: string) {
  const normalized = normalizePath(pagePath);
  if (normalized !== "/" && normalized !== "/el/seo-agency/") return;

  const href = builtInLocale(locale) === "el" ? "/el/seo-marketing-2/" : "/seo-marketing/";
  const links =
    normalized === "/"
      ? Array.from(root.querySelectorAll<HTMLAnchorElement>(".elementor-element-4a2a74c a.elementskit-btn"))
      : Array.from(root.querySelectorAll<HTMLAnchorElement>(".elementor-element-c1bda6c a.elementskit-btn"));

  links.forEach((link) => {
    link.setAttribute("href", href);
    link.classList.remove("freya-circle-cta");
    link.classList.add("freya-primary-cta");
    link.querySelector(".freya-circle-cta-icon")?.remove();

    if (!link.querySelector(":scope > .button-wrapper")) {
      const wrapper = document.createElement("span");
      wrapper.className = "button-wrapper";
      const label = document.createElement("span");
      label.textContent = link.textContent?.replace(/\s+/g, " ").trim() || (normalized === "/" ? "See Services" : "Δείτε τις Υπηρεσίες");
      wrapper.appendChild(label);
      link.replaceChildren(wrapper);
    }
  });
}

function prepareServiceCards(root: HTMLElement, locale: string) {
  const contentLocale = builtInLocale(locale);
  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>(
      "a.fs-blog-card, a.service-card, .service-card, [class*='service-card'], .elementor-widget-icon-box",
    ),
  );
  const grids = new Map<Element, Set<string>>();

  candidates.forEach((candidate) => {
    const heading = candidate.querySelector<HTMLElement>(
      ".fs-post-title, .elementor-icon-box-title, .elementor-heading-title, h2, h3",
    );
    const key = serviceKeyForLabel(heading?.textContent);
    if (!key) return;
    const service = serviceRoutes.find((item) => item.key === key);
    if (!service) return;
    const href = service[contentLocale];

    if (candidate instanceof HTMLAnchorElement) {
      candidate.setAttribute("href", href);
    } else {
      const existing = candidate.querySelector<HTMLAnchorElement>("a[href]");
      if (existing) {
        existing.setAttribute("href", href);
      } else {
        const wrapper = candidate.querySelector<HTMLElement>(":scope > .elementor-icon-box-wrapper");
        if (wrapper) {
          const link = document.createElement("a");
          link.className = "freya-service-card-link";
          link.href = href;
          link.setAttribute("aria-label", heading?.textContent?.trim() || serviceLabels[contentLocale][key]);
          wrapper.parentElement?.insertBefore(link, wrapper);
          link.appendChild(wrapper);
        }
      }
    }

    const grid = candidate.parentElement;
    if (grid) {
      const keys = grids.get(grid) || new Set<string>();
      keys.add(key);
      grids.set(grid, keys);
    }
  });

  grids.forEach((keys, grid) => {
    if (keys.size === serviceRoutes.length) grid.classList.add("freya-service-card-grid");
  });
}

function prepareCertificateGrid(root: HTMLElement) {
  const cards = Array.from(root.querySelectorAll<HTMLElement>(".premium-cert-card"));
  if (cards.length < 2) return;

  const firstContainer = cards[0].parentElement;
  if (!firstContainer) return;
  firstContainer.classList.add("freya-certificate-grid");

  const sourceSections = Array.from(
    new Set(cards.map((card) => card.closest<HTMLElement>(".e-con.e-parent")).filter(Boolean)),
  ) as HTMLElement[];
  cards.forEach((card) => firstContainer.appendChild(card));

  sourceSections.slice(1).forEach((section) => {
    if (!section.querySelector(".premium-cert-card")) section.remove();
  });
}

type CategoryPost = {
  href: string;
  title: string;
  excerpt: string;
  meta: string;
  image: HTMLImageElement | null;
  readMore: string;
};

function categoryPostFromElement(item: HTMLElement): CategoryPost | null {
  const titleLink = item.querySelector<HTMLAnchorElement>(".ultp-block-title a, h2 a, h3 a");
  const href = titleLink?.getAttribute("href") || item.querySelector<HTMLAnchorElement>("a[href]")?.getAttribute("href") || "";
  const title = titleLink?.textContent?.trim() || "";
  if (!href || !title) return null;

  const meta = Array.from(
    item.querySelectorAll<HTMLElement>(".ultp-block-author, .ultp-block-date, .ultp-post-read"),
  )
    .map((element) => element.textContent?.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" \u00b7 ");

  return {
    href,
    title,
    excerpt: item.querySelector<HTMLElement>(".ultp-block-excerpt")?.textContent?.replace(/\s+/g, " ").trim() || "",
    meta,
    image: item.querySelector<HTMLImageElement>("img"),
    readMore: item.querySelector<HTMLElement>(".ultp-block-readmore")?.textContent?.replace(/\s+/g, " ").trim() || "Read More",
  };
}

function createCategoryArticle(post: CategoryPost, featured: boolean) {
  const article = document.createElement("article");
  article.className = featured ? "freya-category-featured" : "freya-category-card";

  if (post.image) {
    const imageLink = document.createElement("a");
    imageLink.className = "freya-category-image";
    imageLink.href = post.href;
    const image = post.image.cloneNode(true) as HTMLImageElement;
    image.removeAttribute("style");
    imageLink.appendChild(image);
    article.appendChild(imageLink);
  }

  const body = document.createElement("div");
  body.className = "freya-category-card-body";
  const heading = document.createElement(featured ? "h2" : "h3");
  const headingLink = document.createElement("a");
  headingLink.href = post.href;
  headingLink.textContent = post.title;
  heading.appendChild(headingLink);
  body.appendChild(heading);

  if (post.meta) {
    const meta = document.createElement("p");
    meta.className = "freya-category-meta";
    meta.textContent = post.meta;
    body.appendChild(meta);
  }
  if (post.excerpt) {
    const excerpt = document.createElement("p");
    excerpt.className = "freya-category-excerpt";
    excerpt.textContent = post.excerpt;
    body.appendChild(excerpt);
  }

  const readMore = document.createElement("a");
  readMore.className = "freya-category-read-more";
  readMore.href = post.href;
  readMore.textContent = post.readMore;
  body.appendChild(readMore);
  article.appendChild(body);
  return article;
}

function prepareEnglishCategoryBlog(root: HTMLElement, pagePath: string) {
  const normalized = normalizePath(pagePath);
  if (normalized !== "/seo-tips/" && normalized !== "/ai-seo/") return;
  if (root.querySelector(".freya-category-blog")) return;

  const sourceBlocks = Array.from(
    root.querySelectorAll<HTMLElement>(".wp-block-ultimate-post-post-slider-1, .ultp-post-grid-block"),
  );
  if (!sourceBlocks.length) return;

  const postsByHref = new Map<string, CategoryPost>();
  sourceBlocks.forEach((block) => {
    block.querySelectorAll<HTMLElement>(".ultp-block-item").forEach((item) => {
      const post = categoryPostFromElement(item);
      if (post && !postsByHref.has(post.href)) postsByHref.set(post.href, post);
    });
  });
  const posts = Array.from(postsByHref.values());
  if (posts.length < 2) return;

  const section = document.createElement("section");
  section.className = "freya-category-blog";
  section.appendChild(createCategoryArticle(posts[0], true));

  const grid = document.createElement("div");
  grid.className = "freya-category-card-grid";
  posts.slice(1).forEach((post) => grid.appendChild(createCategoryArticle(post, false)));
  section.appendChild(grid);
  sourceBlocks[0].parentElement?.insertBefore(section, sourceBlocks[0]);
  sourceBlocks.forEach((block) => block.classList.add("freya-original-blog-layout"));
}

function normalizeHref(href: string | null, locale: string) {
  const contentLocale = builtInLocale(locale);
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return href;

  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return href;
    const normalized = normalizePath(url.pathname);
    const routeFix = legacyRouteFixes[normalized];
    if (routeFix) return `${routeFix}${url.search}${url.hash}`;

    const service = serviceRoutes.find((item) => item.en === normalized || item.el === normalized);
    if (service) return `${service[contentLocale]}${url.search}${url.hash}`;

    return `${normalized}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

function ensureServiceMenu(root: HTMLElement, locale: string) {
  const servicesHref = locale === "el" ? "/el/seo-marketing-2/" : "/seo-marketing/";
  const serviceLink = Array.from(root.querySelectorAll<HTMLAnchorElement>(".elementskit-navbar-nav a[href]")).find(
    (link) => normalizePath(link.getAttribute("href") || "") === servicesHref,
  );
  const serviceItem = serviceLink?.closest("li");
  if (!serviceItem || !serviceLink) return;

  serviceItem.classList.add("menu-item-has-children", "elementskit-dropdown-has");
  serviceLink.classList.add("ekit-menu-dropdown-toggle");
  serviceLink.setAttribute("aria-haspopup", "true");
  serviceLink.setAttribute("aria-expanded", "false");

  let submenu = serviceItem.querySelector<HTMLUListElement>("ul.elementskit-dropdown");
  if (!submenu) {
    submenu = document.createElement("ul");
    submenu.className = "elementskit-dropdown elementskit-submenu-panel";
    serviceItem.appendChild(submenu);
  }

  submenu.innerHTML = localizedServiceMenu(locale)
    .map(
      (item) =>
        `<li class="menu-item menu-item-type-post_type menu-item-object-page nav-item elementskit-mobile-builder-content"><a class="dropdown-item" href="${item.href}">${item.label}</a></li>`,
    )
    .join("");
}

function languageOptionLabel(option: LanguageOption) {
  return option.shortLabel || option.label || option.code.toUpperCase();
}

function immediateLanguageOptions(locale: string, pagePath: string): LanguageOption[] {
  const currentCode = builtInLocale(locale);
  const alternateCode = currentCode === "el" ? "en" : "el";

  return [
    {
      code: currentCode,
      label: currentCode === "el" ? "Greek" : "English",
      shortLabel: currentCode.toUpperCase(),
      href: normalizePath(pagePath),
      current: true,
    },
    {
      code: alternateCode,
      label: alternateCode === "el" ? "Greek" : "English",
      shortLabel: alternateCode.toUpperCase(),
      href: getAlternatePath(pagePath),
      current: false,
    },
  ];
}

function ensureLanguageMenu(root: HTMLElement, languages: LanguageOption[]) {
  if (languages.length < 2) return () => {};

  const navLists = Array.from(root.querySelectorAll<HTMLUListElement>(".elementskit-navbar-nav"));
  const cleanups: Array<() => void> = [];

  navLists.forEach((navList) => {
    navList.querySelectorAll(".pll-parent-menu-item, .lang-item").forEach((item) => item.remove());
    const current = languages.find((language) => language.current) || languages[0];
    const item = document.createElement("li");
    item.className = "menu-item menu-item-has-children elementskit-dropdown-has lang-item freya-language-menu";

    const toggle = document.createElement("a");
    toggle.className = "ekit-menu-dropdown-toggle freya-language-toggle";
    toggle.href = current.href || "/";
    toggle.setAttribute("aria-haspopup", "true");
    toggle.setAttribute("aria-expanded", "false");
    toggle.dataset.languageCode = current.code.toLowerCase();
    toggle.textContent = languageOptionLabel(current);

    const submenu = document.createElement("ul");
    submenu.className = "elementskit-dropdown elementskit-submenu-panel freya-language-dropdown";

    languages.forEach((language) => {
      const languageItem = document.createElement("li");
      languageItem.className = "menu-item nav-item";
      const link = document.createElement("a");
      link.className = "dropdown-item freya-language-option";
      link.href = language.href;
      link.hreflang = language.code;
      link.lang = language.code;
      link.textContent = language.label;
      if (language.current) {
        link.setAttribute("aria-current", "page");
        link.classList.add("active");
      }
      languageItem.appendChild(link);
      submenu.appendChild(languageItem);
    });

    item.appendChild(toggle);
    item.appendChild(submenu);
    navList.appendChild(item);

    const onToggle = (event: MouseEvent) => {
      event.preventDefault();
      const isOpen = submenu.classList.toggle("elementskit-dropdown-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    };
    const onLinkClick = () => {
      submenu.classList.remove("elementskit-dropdown-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", onToggle);
    submenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", onLinkClick));
    cleanups.push(() => {
      toggle.removeEventListener("click", onToggle);
      submenu.querySelectorAll("a").forEach((link) => link.removeEventListener("click", onLinkClick));
      item.remove();
    });
  });

  return () => cleanups.forEach((cleanup) => cleanup());
}

function setActiveLinks(root: HTMLElement, pagePath: string) {
  const current = normalizePath(pagePath);
  root.querySelectorAll(".current-menu-item, .current_page_item, .active").forEach((item) => {
    item.classList.remove("current-menu-item", "current_page_item", "active");
  });

  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    let normalized = "/";
    try {
      normalized = normalizePath(new URL(href, window.location.origin).pathname);
    } catch {
      return;
    }
    const isActive = normalized === current;
    link.toggleAttribute("aria-current", isActive);
    if (isActive) {
      link.classList.add("active");
      link.closest("li")?.classList.add("current-menu-item", "current_page_item", "active");
    }
  });
}

function prefetchNavigationLinks(root: HTMLElement, router: { prefetch: (href: string) => void }) {
  const hrefs = new Set<string>();

  root.querySelectorAll<HTMLAnchorElement>(".site-header a[href], .elementskit-menu-container a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || link.target === "_blank") return;

    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      hrefs.add(`${url.pathname}${url.search}${url.hash}`);
    } catch {
      return;
    }
  });

  if (!hrefs.size) return () => {};

  const prefetch = () => {
    Array.from(hrefs)
      .slice(0, 16)
      .forEach((href) => router.prefetch(href));
  };

  const idleWindow = window as typeof window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (idleWindow.requestIdleCallback) {
    const idleId = idleWindow.requestIdleCallback(prefetch, { timeout: 1200 });
    return () => idleWindow.cancelIdleCallback?.(idleId);
  }

  const timer = window.setTimeout(prefetch, 250);
  return () => window.clearTimeout(timer);
}

function localizeCloneForm(form: HTMLFormElement, locale: string) {
  const copy = formCopy[builtInLocale(locale)];
  const labels = [
    { selector: "input[name='name-1']", label: copy.name, required: true },
    { selector: "input[name='email-1']", label: copy.email, required: true },
    { selector: "textarea[name='textarea-1']", label: copy.message, required: true },
  ];

  form.style.display = "grid";
  form.setAttribute("novalidate", "");

  labels.forEach(({ selector, label, required }) => {
    const field = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
    if (!field) return;
    const labelElement = form.querySelector<HTMLLabelElement>(`label[for='${field.id}']`);
    if (labelElement) {
      labelElement.innerHTML = `${label}${required ? ' <span class="forminator-required">*</span>' : ""}`;
    }
    field.setAttribute("aria-required", String(required));
    field.required = required;
  });

  const submit = form.querySelector<HTMLButtonElement>("button[type='submit'], .forminator-button-submit");
  if (submit) {
    submit.type = "submit";
    submit.textContent = copy.submit;
  }
}

function prepareFormValidation(form: HTMLFormElement, locale: string) {
  const copy = formCopy[builtInLocale(locale)];
  const submit = form.querySelector<HTMLButtonElement>("button[type='submit'], .forminator-button-submit");

  const setMessage = (message: string, isError = false) => {
    let target = form.querySelector<HTMLElement>(".forminator-response-message");
    if (!target) {
      target = document.createElement("div");
      target.className = "forminator-response-message";
      form.prepend(target);
    }
    target.textContent = message;
    target.setAttribute("role", isError ? "alert" : "status");
    target.setAttribute("aria-hidden", "false");
    target.classList.toggle("forminator-error", isError);
    target.classList.toggle("forminator-success", !isError);
  };

  const validateField = (field: HTMLInputElement | HTMLTextAreaElement) => {
    const value = field.value.trim();
    let message = "";
    if (field.required && !value) message = copy.required;
    if (!message && field.type === "email" && value && !/^\S+@\S+\.\S+$/.test(value)) message = copy.emailInvalid;

    const errorId = `${field.id || field.name}-error`;
    let error = form.querySelector<HTMLElement>(`#${CSS.escape(errorId)}`);
    if (message) {
      if (!error) {
        error = document.createElement("small");
        error.id = errorId;
        error.className = "forminator-field-error";
        field.insertAdjacentElement("afterend", error);
      }
      error.textContent = message;
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", errorId);
    } else {
      error?.remove();
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    }
    return !message;
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const fields = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input[name='name-1'], input[name='your-name'], input[name='email-1'], input[name='your-email'], input[name='your-subject'], textarea[name='textarea-1'], textarea[name='your-message']",
      ),
    );
    const valid = fields.every(validateField);
    if (!valid) {
      setMessage(copy.required, true);
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      submit.textContent = copy.sending;
    }

    const fieldValue = (selector: string) => form.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)?.value.trim() || "";

    try {
      const response = await fetch("/api/forms/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fieldValue("input[name='name-1'], input[name='your-name']"),
          email: fieldValue("input[name='email-1'], input[name='your-email']"),
          subject: fieldValue("input[name='your-subject']") || "Website contact",
          message: fieldValue("textarea[name='textarea-1'], textarea[name='your-message']"),
          sourcePage: window.location.pathname,
          language: locale,
        }),
      });
      if (!response.ok) throw new Error("Submission failed");
      setMessage(copy.success);
      form.reset();
    } catch {
      setMessage(copy.required, true);
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute("aria-busy");
        submit.textContent = copy.submit;
      }
    }
  };

  form.addEventListener("submit", onSubmit);
  return () => form.removeEventListener("submit", onSubmit);
}

type CounterSettings = {
  from: number;
  to: number;
  decimals: number;
  delimiter: string;
  duration: number;
};

const counterSelector = ".elementor-counter-number, .counter[data-target]";

function readCounterNumber(value: string | null | undefined) {
  const match = value?.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function decimalPlaces(value: string | null | undefined) {
  const match = value?.match(/\.(\d+)/);
  return match ? match[1].length : 0;
}

function getCounterSettings(counter: HTMLElement): CounterSettings | null {
  const targetText = counter.dataset.toValue || counter.dataset.target || counter.textContent || "";
  const target = readCounterNumber(targetText);
  if (target === null) return null;

  const fromText = counter.dataset.fromValue || "0";
  const from = readCounterNumber(fromText) ?? 0;
  const durationValue = Number(counter.dataset.duration);

  return {
    from,
    to: target,
    decimals: Math.max(decimalPlaces(targetText), decimalPlaces(fromText)),
    delimiter: counter.dataset.delimiter || "",
    duration: Number.isFinite(durationValue) && durationValue > 0 ? Math.min(Math.max(durationValue, 700), 2600) : 1600,
  };
}

function formatCounterValue(value: number, settings: CounterSettings) {
  const sign = value < 0 ? "-" : "";
  const fixed = Math.abs(value).toFixed(settings.decimals);
  const [whole, decimal] = fixed.split(".");
  const formattedWhole = settings.delimiter ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, settings.delimiter) : whole;
  return `${sign}${formattedWhole}${decimal ? `.${decimal}` : ""}`;
}

function animateCounter(counter: HTMLElement) {
  const settings = getCounterSettings(counter);
  if (!settings || counter.dataset.counterAnimated === "true") return undefined;

  counter.dataset.counterAnimated = "true";

  const setValue = (value: number) => {
    counter.textContent = formatCounterValue(value, settings);
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setValue(settings.to);
    return undefined;
  }

  let frame = 0;
  let completed = false;
  const startedAt = performance.now();

  const tick = (now: number) => {
    const progress = Math.min((now - startedAt) / settings.duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    setValue(settings.from + (settings.to - settings.from) * eased);

    if (progress < 1) {
      frame = window.requestAnimationFrame(tick);
    } else {
      completed = true;
      setValue(settings.to);
    }
  };

  setValue(settings.from);
  frame = window.requestAnimationFrame(tick);

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    if (!completed) delete counter.dataset.counterAnimated;
  };
}

function prepareCounterAnimations(root: HTMLElement) {
  const counters = Array.from(root.querySelectorAll<HTMLElement>(counterSelector));
  const animationCleanups: Array<() => void> = [];

  counters.forEach((counter) => {
    if (counter.dataset.counterAnimated === "true") return;
    const settings = getCounterSettings(counter);
    if (!settings) return;
    counter.textContent = formatCounterValue(settings.from, settings);
  });

  const startCounter = (counter: HTMLElement) => {
    const cleanup = animateCounter(counter);
    if (cleanup) animationCleanups.push(cleanup);
  };

  const startCountersIn = (target: Element) => {
    const visibleCounters = target.matches(counterSelector)
      ? [target as HTMLElement]
      : Array.from(target.querySelectorAll<HTMLElement>(counterSelector));
    visibleCounters.forEach(startCounter);
  };

  if (!("IntersectionObserver" in window)) {
    counters.forEach(startCounter);
    return () => animationCleanups.forEach((cleanup) => cleanup());
  }

  const observedTargets = new Set<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        startCountersIn(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.35 },
  );

  counters.forEach((counter) => {
    const target = counter.closest(".elementor-widget-counter, .stat-card") || counter;
    if (observedTargets.has(target)) return;
    observedTargets.add(target);
    observer.observe(target);
  });

  return () => {
    observer.disconnect();
    animationCleanups.forEach((cleanup) => cleanup());
  };
}

type ElementorSettings = Record<string, unknown>;

const elementorAnimationClasses = [
  "bounceIn",
  "bounceInDown",
  "bounceInLeft",
  "bounceInRight",
  "bounceInUp",
  "fadeIn",
  "fadeInDown",
  "fadeInLeft",
  "fadeInRight",
  "fadeInUp",
  "slideInDown",
  "slideInLeft",
  "slideInRight",
  "slideInUp",
  "zoomIn",
  "zoomInDown",
  "zoomInLeft",
  "zoomInRight",
  "zoomInUp",
];

function readElementorSettings(element: Element): ElementorSettings {
  const raw = element.getAttribute("data-settings");
  if (!raw) return {};

  try {
    return JSON.parse(raw) as ElementorSettings;
  } catch {
    return {};
  }
}

type ElementorSettingValue = string | number | boolean;

function firstSettingValue(...values: unknown[]): ElementorSettingValue | undefined {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      const nested: ElementorSettingValue | undefined = firstSettingValue(...value);
      if (nested !== undefined) return nested;
      continue;
    }
    if (typeof value === "object") {
      const nested: ElementorSettingValue | undefined = firstSettingValue(...Object.values(value));
      if (nested !== undefined) return nested;
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  }
  return undefined;
}

function normalizedAnimationName(value: unknown) {
  const animation = String(firstSettingValue(value) ?? "").trim();
  if (!animation || animation === "none") return "";
  return /^[a-zA-Z0-9_-]+$/.test(animation) ? animation : "";
}

function cssTime(value: unknown, fallback: string) {
  const setting = firstSettingValue(value);
  if (typeof setting === "number" && Number.isFinite(setting)) return `${Math.max(0, setting)}ms`;
  if (typeof setting !== "string") return fallback;

  const normalized = setting.trim().toLowerCase();
  if (!normalized) return fallback;
  if (/^\d+(\.\d+)?m?s$/.test(normalized)) return normalized;
  if (/^\d+(\.\d+)?$/.test(normalized)) return `${normalized}ms`;
  if (normalized === "fast") return "600ms";
  if (normalized === "slow") return "1200ms";
  return fallback;
}

function revealElement(target: HTMLElement, animationName: string) {
  target.dataset.freyaReveal = "visible";
  target.classList.remove("elementor-invisible");
  target.classList.add("animated", animationName);
}

function prepareRevealAnimations(root: HTMLElement) {
  const targets = Array.from(root.querySelectorAll<HTMLElement>(".elementor-invisible, [data-settings]"));
  const preparedTargets: HTMLElement[] = [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  targets.forEach((target) => {
    if (target.dataset.freyaRevealPrepared === "true") return;

    const settings = readElementorSettings(target);
    const explicitAnimation = normalizedAnimationName(firstSettingValue(settings.animation, settings._animation));
    const hasExplicitNone = firstSettingValue(settings.animation, settings._animation) === "none";
    const animationName = explicitAnimation || (target.classList.contains("elementor-invisible") && !hasExplicitNone ? "fadeInUp" : "");

    if (!animationName) {
      if (target.classList.contains("elementor-invisible")) target.classList.remove("elementor-invisible");
      return;
    }

    target.dataset.freyaRevealPrepared = "true";
    target.dataset.freyaReveal = "ready";
    target.dataset.freyaAnimation = animationName;
    target.style.setProperty(
      "--freya-reveal-delay",
      cssTime(firstSettingValue(settings.animation_delay, settings._animation_delay), "0ms"),
    );
    target.style.setProperty(
      "--freya-reveal-duration",
      cssTime(firstSettingValue(settings.animation_duration, settings._animation_duration), "850ms"),
    );
    target.classList.remove("animated", ...elementorAnimationClasses);
    preparedTargets.push(target);

    if (reducedMotion) revealElement(target, animationName);
  });

  if (!preparedTargets.length || reducedMotion) return () => {};

  if (!("IntersectionObserver" in window)) {
    preparedTargets.forEach((target) => revealElement(target, target.dataset.freyaAnimation || "fadeInUp"));
    return () => {};
  }

  const targetAnimations = new WeakMap<HTMLElement, string>();
  preparedTargets.forEach((target) => {
    targetAnimations.set(target, target.dataset.freyaAnimation || "fadeInUp");
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target as HTMLElement;
        revealElement(target, targetAnimations.get(target) || "fadeInUp");
        observer.unobserve(target);
      });
    },
    { rootMargin: "0px 0px 12% 0px", threshold: 0.05 },
  );

  preparedTargets.forEach((target) => observer.observe(target));
  return () => observer.disconnect();
}

function prepareGrowthGraphAnimations(root: HTMLElement) {
  const lines = Array.from(root.querySelectorAll<SVGElement>(".growth-graph .graph-line"));
  if (!lines.length) return () => {};

  const reveal = (line: SVGElement) => line.classList.add("animate");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    lines.forEach((line) => {
      line.style.strokeDashoffset = "0";
      const dot = line.nextElementSibling;
      if (dot instanceof SVGElement) dot.style.opacity = "1";
    });
    return () => {
      lines.forEach((line) => {
        line.style.removeProperty("stroke-dashoffset");
        const dot = line.nextElementSibling;
        if (dot instanceof SVGElement) dot.style.removeProperty("opacity");
      });
    };
  }

  if (!("IntersectionObserver" in window)) {
    lines.forEach(reveal);
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target as SVGElement);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px 10% 0px", threshold: 0.1 },
  );

  lines.forEach((line) => observer.observe(line));
  return () => observer.disconnect();
}

function applyVisualRepairs(root: HTMLElement) {
  root.dataset.wpCloneEnhanced = "true";

  root.querySelectorAll<HTMLElement>(".cert-marquee-content").forEach((track) => {
    if (track.dataset.certMarqueePrepared === "true") return;
    const cards = Array.from(track.children).filter((child): child is HTMLElement => child.classList.contains("cert-card"));
    cards.forEach((card) => {
      const clone = card.cloneNode(true) as HTMLElement;
      clone.setAttribute("aria-hidden", "true");
      clone.dataset.certMarqueeClone = "true";
      track.appendChild(clone);
    });
    track.dataset.certMarqueePrepared = "true";
  });

  root.querySelectorAll<HTMLElement>(".tools-marquee-content").forEach((track) => {
    if (track.dataset.marqueePrepared === "true") return;
    const cards = Array.from(track.children).filter((child): child is HTMLElement => child.classList.contains("tools-card"));
    cards.forEach((card) => {
      const clone = card.cloneNode(true) as HTMLElement;
      clone.setAttribute("aria-hidden", "true");
      clone.dataset.marqueeClone = "true";
      track.appendChild(clone);
    });
    track.dataset.marqueePrepared = "true";
  });

  root.querySelectorAll<HTMLElement>(".perf-bar").forEach((bar) => {
    bar.style.setProperty("background", "linear-gradient(180deg, #d7f76b 0%, #3ee98f 48%, #1b8f5a 100%)", "important");
    bar.style.setProperty("animation", "none", "important");
  });
}

async function loadLanguageOptions(pagePath: string) {
  const params = new URLSearchParams({ path: pagePath });
  const query = window.location.search.replace(/^\?/, "");
  if (query) params.set("query", query);
  const response = await fetch(`/api/languages?${params.toString()}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { languages?: LanguageOption[] };
  return Array.isArray(payload.languages)
    ? payload.languages.filter((language) => language.code === "en" || language.code === "el")
    : [];
}

export function WpCloneBehavior({ locale, pagePath }: { locale: string; pagePath: string }) {
  const router = useRouter();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const roots = Array.from(document.querySelectorAll<HTMLElement>(".wp-clone-root"));
    const cleanups: Array<() => void> = [];
    let cancelled = false;

    roots.forEach((root) => {
      applyVisualRepairs(root);
      cleanups.push(prepareRevealAnimations(root));
      cleanups.push(prepareGrowthGraphAnimations(root));
      cleanups.push(prepareCounterAnimations(root));
      cleanups.push(prepareHomepageHeroRotation(root, pagePath, locale));
      ensureServiceMenu(root, locale);
      ensureGreekMainNavigation(root, locale);
      removeFrenchUi(root);
      prepareSeeServicesCta(root, locale, pagePath);
      prepareServiceCards(root, locale);
      prepareCertificateGrid(root);
      prepareEnglishCategoryBlog(root, pagePath);

      root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
        const href = normalizeHref(link.getAttribute("href"), locale);
        if (href) link.setAttribute("href", href);
        if (link.target === "_blank") link.rel = "noopener noreferrer";
      });

      root.querySelectorAll<HTMLAnchorElement>(".pll-parent-menu-item a[href], .pll-parent-menu-item a[hreflang]").forEach((link) => {
        link.setAttribute("href", getAlternatePath(pagePath));
      });

      cleanups.push(ensureLanguageMenu(root, immediateLanguageOptions(locale, pagePath)));
      setActiveLinks(root, pagePath);
      cleanups.push(prefetchNavigationLinks(root, router));

      const closeMenus = () => {
        root.querySelectorAll<HTMLElement>(".elementskit-menu-container.active").forEach((menu) => menu.classList.remove("active"));
        root.querySelectorAll<HTMLElement>(".site-header.mobile-menu-active").forEach((header) => header.classList.remove("mobile-menu-active"));
        root.querySelectorAll<HTMLElement>(".elementskit-dropdown-open").forEach((submenu) => submenu.classList.remove("elementskit-dropdown-open"));
        root.querySelectorAll<HTMLElement>("[aria-expanded='true']").forEach((item) => item.setAttribute("aria-expanded", "false"));
        root.querySelectorAll<HTMLButtonElement>(".elementskit-menu-hamburger.active").forEach((button) => {
          button.classList.remove("active");
          button.setAttribute("aria-label", locale === "el" ? "Άνοιγμα μενού πλοήγησης" : "Open navigation menu");
        });
        document.body.classList.remove("wp-clone-menu-open");
      };

      const menuButtons = Array.from(root.querySelectorAll<HTMLButtonElement>(".elementskit-menu-hamburger, .elementskit-menu-toggler"));
      menuButtons.forEach((button) => {
        const isClose = button.classList.contains("elementskit-menu-close");
        const openLabel = locale === "el" ? "Άνοιγμα μενού πλοήγησης" : "Open navigation menu";
        const closeLabel = locale === "el" ? "Κλείσιμο μενού πλοήγησης" : "Close navigation menu";
        button.setAttribute("aria-label", isClose ? closeLabel : openLabel);
        button.setAttribute("aria-expanded", "false");

        const onClick = (event: MouseEvent) => {
          event.preventDefault();
          if (isClose) {
            closeMenus();
            return;
          }
          const nav = button.closest("nav");
          const menu = nav?.querySelector<HTMLElement>(".elementskit-menu-container");
          const isOpen = menu?.classList.toggle("active") ?? false;
          button.closest(".site-header")?.classList.toggle("mobile-menu-active", isOpen);
          button.classList.toggle("active", isOpen);
          button.setAttribute("aria-expanded", String(isOpen));
          button.setAttribute("aria-label", isOpen ? closeLabel : openLabel);
          document.body.classList.toggle("wp-clone-menu-open", isOpen);
        };
        button.addEventListener("click", onClick);
        cleanups.push(() => button.removeEventListener("click", onClick));
      });

      const dropdownButtons = Array.from(root.querySelectorAll<HTMLAnchorElement>(".ekit-menu-dropdown-toggle"));
      dropdownButtons.forEach((button) => {
        button.setAttribute("aria-haspopup", "true");
        button.setAttribute("aria-expanded", "false");
        const onClick = (event: MouseEvent) => {
          if (button.classList.contains("freya-language-toggle")) return;
          if (!window.matchMedia("(max-width: 1024px)").matches) return;
          const submenu = button.parentElement?.querySelector<HTMLElement>(".elementskit-dropdown");
          if (!submenu) return;
          event.preventDefault();
          const isOpen = submenu.classList.toggle("elementskit-dropdown-open");
          button.setAttribute("aria-expanded", String(isOpen));
        };
        button.addEventListener("click", onClick);
        cleanups.push(() => button.removeEventListener("click", onClick));
      });

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") closeMenus();
      };
      document.addEventListener("keydown", onKeyDown);
      cleanups.push(() => document.removeEventListener("keydown", onKeyDown));

      root.querySelectorAll<HTMLAnchorElement>(".elementskit-menu-container a[href]").forEach((link) => {
        const onClick = () => {
          if (link.classList.contains("ekit-menu-dropdown-toggle") && window.matchMedia("(max-width: 1024px)").matches) return;
          closeMenus();
        };
        link.addEventListener("click", onClick);
        cleanups.push(() => link.removeEventListener("click", onClick));
      });

      root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || link.target === "_blank") return;

        let internalHref = "";
        try {
          const url = new URL(href, window.location.origin);
          if (url.origin !== window.location.origin) return;
          internalHref = `${url.pathname}${url.search}${url.hash}`;
        } catch {
          return;
        }

        const prefetch = () => router.prefetch(internalHref);
        const navigate = (event: MouseEvent) => {
          if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          router.push(internalHref);
          closeMenus();
        };

        link.addEventListener("mouseenter", prefetch, { once: true });
        link.addEventListener("focus", prefetch, { once: true });
        link.addEventListener("click", navigate);
        cleanups.push(() => {
          link.removeEventListener("mouseenter", prefetch);
          link.removeEventListener("focus", prefetch);
          link.removeEventListener("click", navigate);
        });
      });

      const accordionButtons = Array.from(root.querySelectorAll<HTMLAnchorElement>(".ekit-accordion--toggler"));
      accordionButtons.forEach((button) => {
        const onClick = (event: MouseEvent) => {
          event.preventDefault();
          const card = button.closest(".elementskit-card");
          const targetSelector = button.getAttribute("data-target") || button.getAttribute("href");
          const target = targetSelector ? root.querySelector<HTMLElement>(targetSelector.replace(/^#collapse/, "#Collapse")) : null;
          const panel = target || card?.querySelector<HTMLElement>(".collapse");
          const shouldOpen = !(panel?.classList.contains("in") || panel?.classList.contains("show"));

          const group = button.closest(".elementskit-accordion");
          group?.querySelectorAll(".elementskit-card.active").forEach((item) => item.classList.remove("active"));
          group?.querySelectorAll<HTMLElement>(".collapse.in, .collapse.show").forEach((item) => item.classList.remove("in", "show"));
          group?.querySelectorAll<HTMLAnchorElement>(".ekit-accordion--toggler[aria-expanded='true']").forEach((item) => {
            item.setAttribute("aria-expanded", "false");
          });

          if (panel && shouldOpen) {
            panel.classList.add("in", "show");
            card?.classList.add("active");
            button.setAttribute("aria-expanded", "true");
          }
        };
        button.addEventListener("click", onClick);
        cleanups.push(() => button.removeEventListener("click", onClick));
      });

      const forms = Array.from(root.querySelectorAll<HTMLFormElement>("form"));
      forms.forEach((form) => {
        localizeCloneForm(form, locale);
        cleanups.push(prepareFormValidation(form, locale));
      });
    });

    void loadLanguageOptions(pagePath)
      .then((languages) => {
        if (cancelled || languages.length < 2) return;
        roots.forEach((root) => {
          cleanups.push(ensureLanguageMenu(root, languages));
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
      document.body.classList.remove("wp-clone-menu-open");
    };
  }, [locale, pagePath, router]);

  return null;
}
