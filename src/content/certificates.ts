import type { Certificate, Locale } from "@/src/types";

export const certificates: Certificate[] = [
  {
    title: "Google Digital Marketing & E-commerce",
    issuer: "Google & Coursera",
    category: "Digital Marketing",
    date: "2026",
    verificationUrl: "https://www.coursera.org/",
  },
  {
    title: "Google Project Management",
    issuer: "Google & Coursera",
    category: "Project Management",
    date: "2026",
    verificationUrl: "https://www.coursera.org/",
  },
  {
    title: "Introduction to Artificial Intelligence (AI)",
    issuer: "IBM",
    category: "Artificial Intelligence",
    date: "2026",
    verificationUrl: "https://www.coursera.org/",
  },
  {
    title: "Generative AI: Introduction and Applications",
    issuer: "IBM",
    category: "Artificial Intelligence",
    date: "2026",
    verificationUrl: "https://www.coursera.org/",
  },
  {
    title: "Navigating On-Page and Technical SEO: A Semrush DeepDive",
    issuer: "Semrush",
    category: "SEO",
    date: "2026",
    verificationUrl: "https://static.semrush.com/",
  },
  {
    title: "Search and Conversions for Agencies: A Data-Driven Framework",
    issuer: "Semrush",
    category: "Analytics",
    date: "2026",
    verificationUrl: "https://static.semrush.com/",
  },
  {
    title: "Content Marketing Principles for Business",
    issuer: "Semrush",
    category: "Content Marketing",
    date: "2026",
    verificationUrl: "https://static.semrush.com/",
  },
  {
    title: "SEO Principles: An Essential Guide for Beginners",
    issuer: "Semrush",
    category: "SEO",
    date: "2026",
    verificationUrl: "https://static.semrush.com/",
  },
  {
    title: "How to Incorporate PPC Into Your Marketing Strategy",
    issuer: "Semrush",
    category: "Paid Media",
    date: "2026",
    verificationUrl: "https://static.semrush.com/",
  },
];

export const certificatesPage: Record<
  Locale,
  {
    path: string;
    alternateHref: string;
    seoTitle: string;
    metaDescription: string;
    eyebrow: string;
    title: string;
    text: string;
    categoriesLabel: string;
    allLabel: string;
    modalTitle: string;
    ctaTitle: string;
    ctaText: string;
    ctaLabel: string;
  }
> = {
  en: {
    path: "/certificates/",
    alternateHref: "/el/certificates-seo/",
    seoTitle: "SEO and AI Certificates | Freya SEO",
    metaDescription: "Review Freya SEO certificates from Google, IBM, Coursera and Semrush.",
    eyebrow: "Proof of learning",
    title: "SEO, AI and digital marketing certificates.",
    text: "Freya’s work is supported by continuous learning across SEO, AI, analytics, project management and digital marketing.",
    categoriesLabel: "Certificate categories",
    allLabel: "All",
    modalTitle: "Certificate preview",
    ctaTitle: "Want a strategy backed by current SEO knowledge?",
    ctaText: "Let’s talk about your site, your data and the visibility opportunities worth prioritising.",
    ctaLabel: "Let’s Talk",
  },
  el: {
    path: "/el/certificates-seo/",
    alternateHref: "/certificates/",
    seoTitle: "Πιστοποιήσεις SEO και AI | Freya SEO",
    metaDescription: "Δείτε τις πιστοποιήσεις Freya SEO από Google, IBM, Coursera και Semrush.",
    eyebrow: "Απόδειξη συνεχούς μάθησης",
    title: "Πιστοποιήσεις SEO, AI και digital marketing.",
    text: "Η δουλειά της Freya υποστηρίζεται από συνεχή μάθηση σε SEO, AI, analytics, project management και digital marketing.",
    categoriesLabel: "Κατηγορίες πιστοποιήσεων",
    allLabel: "Όλες",
    modalTitle: "Προεπισκόπηση πιστοποιητικού",
    ctaTitle: "Θέλετε στρατηγική βασισμένη σε σύγχρονη SEO γνώση;",
    ctaText: "Ας μιλήσουμε για το site, τα δεδομένα και τις ευκαιρίες ορατότητας που αξίζει να προτεραιοποιήσετε.",
    ctaLabel: "Ας μιλήσουμε",
  },
};
