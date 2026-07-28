"use client";

import { useEffect } from "react";

export function ServiceEndingCTA({ pagePath }: { pagePath: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`[data-page-path="${CSS.escape(pagePath)}"]`);
    if (!root) return;

    const footer = root.querySelector("#site-footer");
    const matchingHeading = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2")).find((heading) => {
      if (footer?.contains(heading)) return false;
      return heading.textContent?.toLowerCase().includes("curious where you actually stand");
    });
    const section =
      root.querySelector<HTMLElement>(".freya-service-ending-cta") ||
      matchingHeading?.closest<HTMLElement>(".e-con.e-parent");
    if (!section) return;

    section.classList.add("freya-service-ending-cta");
    section.querySelectorAll<HTMLElement>(".elementor-invisible").forEach((element) => {
      element.classList.remove("elementor-invisible");
      element.dataset.freyaReveal = "visible";
    });
  }, [pagePath]);

  return null;
}
