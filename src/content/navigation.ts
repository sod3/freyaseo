import {
  Bot,
  ChartSpline,
  Home,
  Mail,
  Newspaper,
  ScrollText,
  Settings2,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { IconComponent, Locale, ServiceKey } from "@/src/types";

export type NavigationCopy = {
  home: string;
  services: string;
  certificates: string;
  about: string;
  blog: string;
  contact: string;
  cta: string;
  serviceItems: Array<{
    key: ServiceKey;
    title: string;
    description: string;
    href: string;
    icon: IconComponent;
  }>;
  primary: Array<{ label: string; href: string; icon: IconComponent }>;
};

export const navigation: Record<Locale, NavigationCopy> = {
  en: {
    home: "Main Page",
    services: "Services",
    certificates: "SEO Certificates",
    about: "About",
    blog: "Blog",
    contact: "Contact",
    cta: "Free SEO Check",
    serviceItems: [
      {
        key: "aiSeo",
        title: "AI SEO",
        description: "Visibility across Google, ChatGPT, Gemini and answer engines.",
        href: "/ai-seo-2/",
        icon: Sparkles,
      },
      {
        key: "automation",
        title: "Automation",
        description: "AI-assisted workflows that remove repetitive marketing tasks.",
        href: "/automation/",
        icon: Bot,
      },
      {
        key: "reporting",
        title: "Reporting",
        description: "Dashboards that turn scattered data into decisions.",
        href: "/report/",
        icon: ChartSpline,
      },
      {
        key: "toolGeneration",
        title: "Tool Generation",
        description: "Custom tools, APIs and internal systems shaped around your workflow.",
        href: "/tool-generation/",
        icon: Settings2,
      },
    ],
    primary: [
      { label: "Main Page", href: "/", icon: Home },
      { label: "SEO Certificates", href: "/certificates/", icon: ScrollText },
      { label: "About", href: "/about/", icon: UserRound },
      { label: "Blog", href: "/blog/", icon: Newspaper },
      { label: "Contact", href: "/contact-2/", icon: Mail },
    ],
  },
  el: {
    home: "Αρχική",
    services: "Υπηρεσίες",
    certificates: "Πιστοποιήσεις SEO",
    about: "Σχετικά",
    blog: "Blog",
    contact: "Επικοινωνία",
    cta: "Δωρεάν SEO Έλεγχος",
    serviceItems: [
      {
        key: "aiSeo",
        title: "AI SEO",
        description: "Ορατότητα σε Google, ChatGPT, Gemini και AI μηχανές απαντήσεων.",
        href: "/el/ai-seo-4/",
        icon: Sparkles,
      },
      {
        key: "automation",
        title: "Αυτοματισμοί",
        description: "AI workflows που αφαιρούν επαναλαμβανόμενες εργασίες από την ομάδα σας.",
        href: "/el/automation-2/",
        icon: Bot,
      },
      {
        key: "reporting",
        title: "Αναφορές",
        description: "Dashboards που μετατρέπουν διάσπαρτα δεδομένα σε καθαρές αποφάσεις.",
        href: "/el/report-2/",
        icon: ChartSpline,
      },
      {
        key: "toolGeneration",
        title: "Δημιουργία Εργαλείων",
        description: "Προσαρμοσμένα εργαλεία, APIs και εσωτερικά συστήματα για τη ροή εργασίας σας.",
        href: "/el/tool-generation-2/",
        icon: Settings2,
      },
    ],
    primary: [
      { label: "Αρχική", href: "/el/seo-agency/", icon: Home },
      { label: "Πιστοποιήσεις SEO", href: "/el/certificates-seo/", icon: ScrollText },
      { label: "Σχετικά", href: "/el/about-us/", icon: UserRound },
      { label: "Blog", href: "/el/seo-blog/", icon: Newspaper },
      { label: "Επικοινωνία", href: "/el/lets-contact/", icon: Mail },
    ],
  },
};

export function getNavigation(locale: Locale) {
  return navigation[locale];
}
