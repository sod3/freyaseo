"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCommon } from "@/src/content/common";
import { getLocaleFromPath } from "@/src/content/route-map";
import { getNavigation } from "@/src/content/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { cn } from "@/src/lib/cn";

export function Header() {
  const pathname = usePathname() || "/";
  const locale = getLocaleFromPath(pathname);
  const nav = getNavigation(locale);
  const common = getCommon(locale);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!servicesRef.current?.contains(event.target as Node)) setServicesOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setServicesOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const serviceButtonLabel = servicesOpen ? common.actions.closeServices : common.actions.openServices;

  return (
    <header className={cn("site-header", scrolled && "site-header-solid")}>
      <div className="mx-auto flex h-[76px] w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={locale === "el" ? "/el/seo-agency/" : "/"} className="brand-mark" aria-label="Freya SEO">
          <Image src="/images/brand/logo.png" alt="Freya SEO logo" width={112} height={56} priority className="h-12 w-auto object-contain" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          <Link className="nav-link" href={locale === "el" ? "/el/seo-agency/" : "/"}>
            {nav.home}
          </Link>
          <div className="relative" ref={servicesRef}>
            <button
              className="nav-link inline-flex items-center gap-1"
              type="button"
              aria-expanded={servicesOpen}
              aria-haspopup="true"
              aria-label={serviceButtonLabel}
              onClick={() => setServicesOpen((open) => !open)}
            >
              {nav.services}
              <ChevronDown className={cn("h-4 w-4 transition-transform", servicesOpen && "rotate-180")} aria-hidden />
            </button>
            <AnimatePresence>
              {servicesOpen ? (
                <motion.div
                  className="services-dropdown"
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                >
                  {nav.serviceItems.map((item) => (
                    <Link key={item.href} className="service-dropdown-item" href={item.href} onClick={() => setServicesOpen(false)}>
                      <item.icon className="h-5 w-5 text-[var(--primary)]" aria-hidden />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                      </span>
                    </Link>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          {nav.primary.slice(1).map((item) => (
            <Link key={item.href} className="nav-link" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher pathname={pathname} />
          <Link href={locale === "el" ? "/el/lets-contact/" : "/contact-2/"} className="button button-primary button-compact">
            {nav.cta}
          </Link>
        </div>

        <button
          type="button"
          className="icon-button lg:hidden"
          aria-label={mobileOpen ? common.actions.closeMenu : common.actions.openMenu}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22 }}
          >
            <div className="mobile-menu-panel">
              <Link className="mobile-link" href={locale === "el" ? "/el/seo-agency/" : "/"} onClick={() => setMobileOpen(false)}>
                {nav.home}
              </Link>
              <details className="mobile-details" open>
                <summary>{nav.services}</summary>
                <div className="mt-3 grid gap-2">
                  {nav.serviceItems.map((item) => (
                    <Link className="mobile-service-link" key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                      <item.icon className="h-5 w-5 text-[var(--primary)]" aria-hidden />
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </div>
              </details>
              {nav.primary.slice(1).map((item) => (
                <Link className="mobile-link" href={item.href} key={item.href} onClick={() => setMobileOpen(false)}>
                  <item.icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-3">
                <LanguageSwitcher pathname={pathname} />
                <Link className="button button-primary justify-center" href={locale === "el" ? "/el/lets-contact/" : "/contact-2/"} onClick={() => setMobileOpen(false)}>
                  {nav.cta}
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
