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
  const flag = option.flagEmoji ? `${option.flagEmoji} ` : "";
  return `${flag}${option.shortLabel || option.label || option.code.toUpperCase()}`;
}

function ensureLanguageMenu(root: HTMLElement, languages: LanguageOption[]) {
  if (languages.length < 2) return () => {};

  const navLists = Array.from(root.querySelectorAll<HTMLUListElement>(".elementskit-navbar-nav"));
  const cleanups: Array<() => void> = [];

  navLists.forEach((navList) => {
    navList.querySelectorAll(".lang-item").forEach((item) => item.remove());
    const current = languages.find((language) => language.current) || languages[0];
    const item = document.createElement("li");
    item.className = "menu-item menu-item-has-children elementskit-dropdown-has lang-item freya-language-menu";

    const toggle = document.createElement("a");
    toggle.className = "ekit-menu-dropdown-toggle freya-language-toggle";
    toggle.href = current.href || "/";
    toggle.setAttribute("aria-haspopup", "true");
    toggle.setAttribute("aria-expanded", "false");
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
      link.textContent = language.flagEmoji ? `${language.flagEmoji} ${language.label}` : language.label;
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

async function loadLanguageOptions(pagePath: string) {
  const response = await fetch(`/api/languages?path=${encodeURIComponent(pagePath)}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { languages?: LanguageOption[] };
  return Array.isArray(payload.languages) ? payload.languages : [];
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
      cleanups.push(prepareCounterAnimations(root));
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
