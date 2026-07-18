"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export function BackToTopButton({ locale }: { locale: string }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setIsVisible(window.scrollY > 320);

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <button
      aria-label={locale === "el" ? "Επιστροφή στην κορυφή" : "Back to top"}
      className={`freya-back-to-top${isVisible ? " is-visible" : ""}`}
      onClick={scrollToTop}
      type="button"
    >
      <ChevronUp aria-hidden="true" strokeWidth={3} />
    </button>
  );
}
