import type { BlogPost, FAQ, Locale, ServicePageData } from "@/src/types";
import { siteUrl } from "@/src/content/route-map";

export function organizationJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Freya SEO",
    url: siteUrl,
    logo: `${siteUrl}/images/brand/logo.png`,
    sameAs: ["https://www.instagram.com/freyaseo", "https://www.linkedin.com/company/freya-seo"],
    description:
      locale === "el"
        ? "Η Freya SEO βοηθά επιχειρήσεις να βελτιώσουν την ορατότητά τους σε Google, AI search και οργανικά κανάλια."
        : "Freya SEO helps businesses improve visibility across Google, AI search and organic growth channels.",
  };
}

export function personJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Pavlina Hörmann",
    jobTitle: locale === "el" ? "SEO Manager και AI Marketer" : "SEO Manager and AI Marketer",
    worksFor: { "@type": "Organization", name: "Freya SEO" },
    image: `${siteUrl}/images/home/pavlina.webp`,
  };
}

export function serviceJsonLd(service: ServicePageData) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    serviceType: service.eyebrow,
    provider: { "@type": "Organization", name: "Freya SEO", url: siteUrl },
    url: `${siteUrl}${service.href}`,
    description: service.description,
    areaServed: "Europe",
  };
}

export function faqJsonLd(faqs: FAQ[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function articleJsonLd(post: BlogPost, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    image: `${siteUrl}${post.image}`,
    datePublished: post.publicationDate,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "Freya SEO", logo: { "@type": "ImageObject", url: `${siteUrl}/images/brand/logo.png` } },
    mainEntityOfPage: `${siteUrl}${path}`,
  };
}

export function breadcrumbJsonLd(items: Array<{ label: string; href: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${siteUrl}${item.href}`,
    })),
  };
}
