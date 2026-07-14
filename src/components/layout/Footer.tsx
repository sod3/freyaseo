"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, BriefcaseBusiness, Camera } from "lucide-react";
import { getCommon } from "@/src/content/common";
import { getLocaleFromPath } from "@/src/content/route-map";
import { getNavigation } from "@/src/content/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Footer() {
  const pathname = usePathname() || "/";
  const locale = getLocaleFromPath(pathname);
  const nav = getNavigation(locale);
  const common = getCommon(locale);
  const footer = common.footer;

  return (
    <footer className="site-footer">
      <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Link href={locale === "el" ? "/el/seo-agency/" : "/"} className="mb-5 inline-flex">
            <Image src="/images/brand/logo.png" alt="Freya SEO logo" width={120} height={60} className="h-14 w-auto object-contain" />
          </Link>
          <p className="max-w-md text-sm leading-7 text-[var(--text-secondary)]">{footer.description}</p>
          <div className="mt-5 flex items-center gap-3">
            <a className="icon-button" href="https://www.instagram.com" aria-label="Instagram">
              <Camera className="h-5 w-5" aria-hidden />
            </a>
            <a className="icon-button" href="https://www.linkedin.com" aria-label="LinkedIn">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden />
            </a>
          </div>
        </div>

        <div>
          <h2 className="footer-title">{footer.services}</h2>
          <ul className="footer-list">
            {nav.serviceItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="footer-title">{footer.usefulLinks}</h2>
          <ul className="footer-list">
            <li>
              <Link href={locale === "el" ? "/el/certificates-seo/" : "/certificates/"}>{footer.certificates}</Link>
            </li>
            <li>
              <Link href={locale === "el" ? "/el/about-us/" : "/about/"}>{footer.about}</Link>
            </li>
            <li>
              <Link href={locale === "el" ? "/el/seo-blog/" : "/blog/"}>{nav.blog}</Link>
            </li>
            <li>
              <a href="#">{footer.privacy}</a>
            </li>
            <li>
              <a href="#">{footer.terms}</a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="footer-title">{footer.contact}</h2>
          <ul className="footer-list">
            <li>
              <a href="mailto:pavlinahormann@gmail.com">pavlinahormann@gmail.com</a>
            </li>
            <li>{footer.response}</li>
          </ul>
          <div className="mt-5">
            <LanguageSwitcher pathname={pathname} />
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-start justify-between gap-4 px-4 py-5 text-sm text-[var(--text-muted)] sm:px-6 md:flex-row md:items-center lg:px-8">
          <p>© {new Date().getFullYear()} {footer.copyright}</p>
          <button className="back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <ArrowUp className="h-4 w-4" aria-hidden />
            {common.actions.backToTop}
          </button>
        </div>
      </div>
    </footer>
  );
}
