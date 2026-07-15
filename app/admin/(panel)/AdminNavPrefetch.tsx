"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AdminNavPrefetch() {
  const router = useRouter();

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".admin-nav");
    if (!nav) return;

    const prefetch = (event: Event) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href^='/admin/']");
      if (!link) return;
      router.prefetch(link.pathname + link.search);
    };

    nav.addEventListener("pointerover", prefetch);
    nav.addEventListener("focusin", prefetch);
    return () => {
      nav.removeEventListener("pointerover", prefetch);
      nav.removeEventListener("focusin", prefetch);
    };
  }, [router]);

  return null;
}
