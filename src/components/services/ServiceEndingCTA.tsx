"use client";

import { useEffect } from "react";

export function ServiceEndingCTA({ pagePath }: { pagePath: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`[data-page-path="${CSS.escape(pagePath)}"]`);
    if (!root) return;

    const footer = root.querySelector("#site-footer");
    const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2")).filter(
      (heading) => !footer?.contains(heading),
    );
    const section = headings.at(-1)?.closest<HTMLElement>(".e-con.e-parent");
    if (!section) return;

    section.classList.add("freya-service-ending-cta");
    section.querySelectorAll<HTMLElement>(".elementor-invisible").forEach((element) => {
      element.classList.remove("elementor-invisible");
      element.dataset.freyaReveal = "visible";
    });

    return () => {
      section.classList.remove("freya-service-ending-cta");
    };
  }, [pagePath]);

  return null;
}
