"use client";

import { useEffect } from "react";

export function WpCloneBehavior({ locale }: { locale: "en" | "el" }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const roots = Array.from(document.querySelectorAll<HTMLElement>(".wp-clone-root"));
    const cleanups: Array<() => void> = [];

    roots.forEach((root) => {
      const menuButtons = Array.from(root.querySelectorAll<HTMLButtonElement>(".elementskit-menu-hamburger, .elementskit-menu-toggler"));
      menuButtons.forEach((button) => {
        const onClick = (event: MouseEvent) => {
          event.preventDefault();
          const nav = button.closest("nav");
          const menu = nav?.querySelector<HTMLElement>(".elementskit-menu-container");
          menu?.classList.toggle("active");
          button.closest(".site-header")?.classList.toggle("mobile-menu-active", menu?.classList.contains("active") ?? false);
        };
        button.addEventListener("click", onClick);
        cleanups.push(() => button.removeEventListener("click", onClick));
      });

      const dropdownButtons = Array.from(root.querySelectorAll<HTMLAnchorElement>(".ekit-menu-dropdown-toggle"));
      dropdownButtons.forEach((button) => {
        const onClick = (event: MouseEvent) => {
          if (!window.matchMedia("(max-width: 1024px)").matches) return;
          const submenu = button.parentElement?.querySelector<HTMLElement>(".elementskit-dropdown");
          if (!submenu) return;
          event.preventDefault();
          submenu.classList.toggle("elementskit-dropdown-open");
        };
        button.addEventListener("click", onClick);
        cleanups.push(() => button.removeEventListener("click", onClick));
      });

      const accordionButtons = Array.from(root.querySelectorAll<HTMLAnchorElement>(".ekit-accordion--toggler"));
      accordionButtons.forEach((button) => {
        const onClick = (event: MouseEvent) => {
          event.preventDefault();
          const card = button.closest(".elementskit-card");
          const targetSelector = button.getAttribute("data-target") || button.getAttribute("href");
          const target = targetSelector ? root.querySelector<HTMLElement>(targetSelector.replace(/^#collapse/, "#Collapse")) : null;
          const panel = target || card?.querySelector<HTMLElement>(".collapse");
          const shouldOpen = !panel?.classList.contains("in");

          const group = button.closest(".elementskit-accordion");
          group?.querySelectorAll(".elementskit-card.active").forEach((item) => item.classList.remove("active"));
          group?.querySelectorAll<HTMLElement>(".collapse.in").forEach((item) => item.classList.remove("in"));
          group?.querySelectorAll<HTMLAnchorElement>(".ekit-accordion--toggler[aria-expanded='true']").forEach((item) => {
            item.setAttribute("aria-expanded", "false");
          });

          if (panel && shouldOpen) {
            panel.classList.add("in");
            card?.classList.add("active");
            button.setAttribute("aria-expanded", "true");
          }
        };
        button.addEventListener("click", onClick);
        cleanups.push(() => button.removeEventListener("click", onClick));
      });

      const forms = Array.from(root.querySelectorAll<HTMLFormElement>("form"));
      forms.forEach((form) => {
        const onSubmit = (event: SubmitEvent) => {
          event.preventDefault();
          const existing = form.querySelector(".wp-clone-form-message");
          existing?.remove();
          const message = document.createElement("p");
          message.className = "wp-clone-form-message";
          message.setAttribute("role", "status");
          message.textContent = locale === "el" ? "Το μήνυμά σας είναι έτοιμο για αποστολή." : "Your message is ready to send.";
          form.appendChild(message);
        };
        form.addEventListener("submit", onSubmit);
        cleanups.push(() => form.removeEventListener("submit", onSubmit));
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [locale]);

  return null;
}
