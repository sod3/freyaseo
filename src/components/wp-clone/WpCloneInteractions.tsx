"use client";

import { useEffect } from "react";

type WpCloneInteractionsProps = {
  pageKey: string;
};

export function WpCloneInteractions({ pageKey }: WpCloneInteractionsProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`[data-wp-clone-root="${pageKey}"]`);
    if (!root) return;

    const closeMenus = () => {
      root.querySelectorAll<HTMLElement>(".elementskit-menu-container.active").forEach((menu) => {
        menu.classList.remove("active");
      });
      root.querySelectorAll<HTMLElement>(".site-header.mobile-menu-active").forEach((header) => {
        header.classList.remove("mobile-menu-active");
      });
    };

    const onClick = (event: MouseEvent) => {
      const clicked = event.target instanceof Element ? event.target : null;
      if (!clicked) return;

      const hamburger = clicked.closest<HTMLButtonElement>(".elementskit-menu-hamburger");
      if (hamburger) {
        event.preventDefault();
        const nav = hamburger.closest("nav");
        const menu = nav?.querySelector<HTMLElement>(".elementskit-menu-container");
        menu?.classList.toggle("active");
        hamburger.closest(".site-header")?.classList.toggle("mobile-menu-active", menu?.classList.contains("active") ?? false);
        return;
      }

      if (clicked.closest(".elementskit-menu-close, .ekit-nav-menu--overlay")) {
        event.preventDefault();
        closeMenus();
        return;
      }

      const dropdownToggle = clicked.closest<HTMLAnchorElement>(".ekit-menu-dropdown-toggle");
      if (dropdownToggle && window.matchMedia("(max-width: 1024px)").matches) {
        const submenu = dropdownToggle.parentElement?.querySelector<HTMLElement>(".elementskit-dropdown");
        if (submenu) {
          event.preventDefault();
          submenu.classList.toggle("elementskit-dropdown-open");
        }
      }

      const accordionToggle = clicked.closest<HTMLAnchorElement>(".ekit-accordion--toggler");
      if (accordionToggle) {
        const selector = accordionToggle.getAttribute("data-target") || accordionToggle.getAttribute("href");
        if (!selector || !selector.startsWith("#")) return;
        const panel = root.querySelector<HTMLElement>(selector);
        if (!panel) return;
        event.preventDefault();
        const isOpen = panel.classList.toggle("in");
        accordionToggle.classList.toggle("collapsed", !isOpen);
        accordionToggle.setAttribute("aria-expanded", String(isOpen));
      }
    };

    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("click", onClick);
    };
  }, [pageKey]);

  return null;
}
