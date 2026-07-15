import type { ComponentType } from "react";

export type Locale = "en" | "el";

export type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export type LinkItem = {
  label: string;
  href: string;
  description?: string;
};

export type Metric = {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  note?: string;
};

export type FAQ = {
  question: string;
  answer: string;
};

export type ProcessStep = {
  title: string;
  text: string;
};

export type Benefit = {
  title: string;
  text: string;
};

export type ServiceFeature = {
  title: string;
  text: string;
};

export type ToolItem = {
  name: string;
  logo: string;
  alt: string;
};

export type ServiceSummary = {
  key: ServiceKey;
  title: string;
  eyebrow: string;
  description: string;
  benefits: string[];
  href: string;
};

export type ServiceKey = "aiSeo" | "automation" | "reporting" | "toolGeneration";

export type ServicePageData = {
  locale: Locale;
  key: ServiceKey;
  slug: string;
  href: string;
  alternateHref: string;
  eyebrow: string;
  title: string;
  description: string;
  heroMetrics: Metric[];
  overviewTitle: string;
  overviewText: string;
  offers: ServiceFeature[];
  benefitsTitle: string;
  benefitsIntro: string;
  benefits: Benefit[];
  toolsTitle: string;
  tools: ToolItem[];
  processTitle: string;
  process: ProcessStep[];
  dashboardTitle: string;
  dashboardText: string;
  faqsTitle: string;
  faqsIntro: string;
  faqs: FAQ[];
  ctaTitle: string;
  ctaText: string;
  ctaLabel: string;
};

export type BlogPost = {
  title: string;
  slug: string;
  locale: Locale;
  excerpt: string;
  image: string;
  imageAlt: string;
  category: string;
  readingTime: string;
  publicationDate: string;
  author: string;
  bodyHtml?: string;
  content: Array<{
    heading: string;
    body: string[];
  }>;
  seoTitle: string;
  metaDescription: string;
};

export type Certificate = {
  title: string;
  issuer: string;
  category: string;
  date?: string;
  verificationUrl?: string;
  image?: string;
};

export type PageSeo = {
  title: string;
  description: string;
  path: string;
  locale: Locale;
};
