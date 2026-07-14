"use client";

import { useEffect } from "react";
import { getAlternatePath, normalizePath, serviceRoutes } from "@/src/content/route-map";
import type { Locale } from "@/src/types";

type ServiceMenuItem = {
  label: string;
  href: string;
};

const legacyRouteFixes: Record<string, string> = {
  "/backlinks/": "/category/backlinks/",
  "/content-marketing/": "/category/content-marketing/",
};

const serviceLabels: Record<Locale, Record<(typeof serviceRoutes)[number]["key"], string>> = {
  en: {
    aiSeo: "AI SEO",
    automation: "Automation",
    reporting: "Report",
    toolGeneration: "Tool Generation",
  },
  el: {
    aiSeo: "AI SEO",
    automation: "Αυτοματισμοί",
    reporting: "Αναφορές",
    toolGeneration: "Δημιουργία Εργαλείων",
  },
};

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
} satisfies Record<Locale, Record<string, string>>;

function localizedServiceMenu(locale: Locale): ServiceMenuItem[] {
  return serviceRoutes.map((service) => ({
    label: serviceLabels[locale][service.key],
    href: service[locale],
  }));
}

function normalizeHref(href: string | null, locale: Locale) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return href;

  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return href;
    const normalized = normalizePath(url.pathname);
    const routeFix = legacyRouteFixes[normalized];
    if (routeFix) return `${routeFix}${url.search}${url.hash}`;

    const service = serviceRoutes.find((item) => item.en === normalized || item.el === normalized);
    if (service) return `${service[locale]}${url.search}${url.hash}`;

    return `${normalized}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

function ensureServiceMenu(root: HTMLElement, locale: Locale) {
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

function localizeCloneForm(form: HTMLFormElement, locale: Locale) {
  const copy = formCopy[locale];
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

function prepareFormValidation(form: HTMLFormElement, locale: Locale) {
  const copy = formCopy[locale];
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

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const fields = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[name='name-1'], input[name='email-1'], textarea[name='textarea-1']"),
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

    window.setTimeout(() => {
      setMessage(copy.success);
      form.reset();
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute("aria-busy");
        submit.textContent = copy.submit;
      }
    }, 250);
  };

  form.addEventListener("submit", onSubmit);
  return () => form.removeEventListener("submit", onSubmit);
}

function applyVisualRepairs(root: HTMLElement) {
  root.dataset.wpCloneEnhanced = "true";

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

  root.querySelectorAll<HTMLImageElement>(".site-logo img, .primary-logo img").forEach((logo) => {
    const logoWidget = logo.closest<HTMLElement>(".elementor-widget-ks_site_logo, .site-logo-wrapper, .primary-logo, .elementor-element");
    logoWidget?.style.setProperty("width", "clamp(112px, 11vw, 150px)", "important");
    logoWidget?.style.setProperty("max-width", "clamp(112px, 11vw, 150px)", "important");
    logoWidget?.style.setProperty("max-height", "none", "important");
    logoWidget?.parentElement?.style.setProperty("width", "clamp(112px, 11vw, 150px)", "important");
    logoWidget?.parentElement?.style.setProperty("max-height", "none", "important");
    logo.style.setProperty("width", "clamp(112px, 11vw, 150px)", "important");
    logo.style.setProperty("max-width", "clamp(112px, 11vw, 150px)", "important");
    logo.style.setProperty("min-width", "112px", "important");
    logo.style.setProperty("height", "auto", "important");
    logo.style.setProperty("max-height", "none", "important");
  });
}

export function WpCloneBehavior({ locale, pagePath }: { locale: Locale; pagePath: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const roots = Array.from(document.querySelectorAll<HTMLElement>(".wp-clone-root"));
    const cleanups: Array<() => void> = [];

    roots.forEach((root) => {
      applyVisualRepairs(root);
      ensureServiceMenu(root, locale);

      root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
        const href = normalizeHref(link.getAttribute("href"), locale);
        if (href) link.setAttribute("href", href);
        if (link.target === "_blank") link.rel = "noopener noreferrer";
      });

      root.querySelectorAll<HTMLAnchorElement>(".lang-item a[href], a[hreflang]").forEach((link) => {
        link.setAttribute("href", getAlternatePath(pagePath));
      });

      setActiveLinks(root, pagePath);

      const closeMenus = () => {
        root.querySelectorAll<HTMLElement>(".elementskit-menu-container.active").forEach((menu) => menu.classList.remove("active"));
        root.querySelectorAll<HTMLElement>(".site-header.mobile-menu-active").forEach((header) => header.classList.remove("mobile-menu-active"));
        root.querySelectorAll<HTMLElement>(".elementskit-dropdown-open").forEach((submenu) => submenu.classList.remove("elementskit-dropdown-open"));
        root.querySelectorAll<HTMLElement>("[aria-expanded='true']").forEach((item) => item.setAttribute("aria-expanded", "false"));
        document.body.classList.remove("wp-clone-menu-open");
      };

      const menuButtons = Array.from(root.querySelectorAll<HTMLButtonElement>(".elementskit-menu-hamburger, .elementskit-menu-toggler"));
      menuButtons.forEach((button) => {
        const isClose = button.classList.contains("elementskit-menu-close");
        button.setAttribute(
          "aria-label",
          isClose
            ? locale === "el"
              ? "Κλείσιμο μενού πλοήγησης"
              : "Close navigation menu"
            : locale === "el"
              ? "Άνοιγμα μενού πλοήγησης"
              : "Open navigation menu",
        );
        button.setAttribute("aria-expanded", "false");

        const onClick = (event: MouseEvent) => {
          event.preventDefault();
          const nav = button.closest("nav");
          const menu = nav?.querySelector<HTMLElement>(".elementskit-menu-container");
          const isOpen = menu?.classList.toggle("active") ?? false;
          button.closest(".site-header")?.classList.toggle("mobile-menu-active", isOpen);
          button.setAttribute("aria-expanded", String(isOpen));
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
        const onClick = () => closeMenus();
        link.addEventListener("click", onClick);
        cleanups.push(() => link.removeEventListener("click", onClick));
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

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      document.body.classList.remove("wp-clone-menu-open");
    };
  }, [locale, pagePath]);

  return null;
}
