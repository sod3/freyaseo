import { blogPostsEn } from "./en";
import { blogPostsEl } from "./el";
import type { BlogPost, Locale } from "@/src/types";

export { blogPostsEn, blogPostsEl };

export const blogPosts: Record<Locale, BlogPost[]> = {
  en: blogPostsEn,
  el: blogPostsEl,
};

export const blogPageCopy = {
  en: {
    path: "/blog/",
    alternateHref: "/el/seo-blog/",
    seoTitle: "SEO Blog: Tips & AI SEO Guides | Freya SEO",
    metaDescription: "Read Freya SEO guides about AI SEO, search strategy, analytics and organic growth.",
    eyebrow: "Knowledge hub",
    title: "SEO Blog for sharper search, AI visibility and organic growth.",
    text: "Practical thinking on SEO strategy, AI search, content, analytics and the systems that make organic growth easier to understand.",
    featured: "Featured article",
    categories: "Categories",
    searchPlaceholder: "Search articles",
    empty: "No articles match that search yet.",
    newsletterTitle: "Keep your SEO thinking current.",
    newsletterText: "Newsletter integration placeholder for future backend or email platform connection.",
  },
  el: {
    path: "/el/seo-blog/",
    alternateHref: "/blog/",
    seoTitle: "SEO Blog: Λέξεις Κλειδιά & AI SEO Οδηγοί | Freya SEO",
    metaDescription: "Διαβάστε οδηγούς Freya SEO για AI SEO, στρατηγική αναζήτησης, analytics και οργανική ανάπτυξη.",
    eyebrow: "Κέντρο γνώσης",
    title: "SEO Blog για πιο καθαρή στρατηγική, AI visibility και οργανική ανάπτυξη.",
    text: "Πρακτική σκέψη για SEO strategy, AI search, περιεχόμενο, analytics και συστήματα που κάνουν την οργανική ανάπτυξη πιο κατανοητή.",
    featured: "Προτεινόμενο άρθρο",
    categories: "Κατηγορίες",
    searchPlaceholder: "Αναζήτηση άρθρων",
    empty: "Δεν υπάρχουν άρθρα που να ταιριάζουν με την αναζήτηση.",
    newsletterTitle: "Κρατήστε τη SEO σκέψη σας ενημερωμένη.",
    newsletterText: "Placeholder για μελλοντική σύνδεση newsletter ή email platform.",
  },
};

export function getBlogPosts(locale: Locale) {
  return blogPosts[locale];
}

export function getBlogPost(locale: Locale, slug: string) {
  return blogPosts[locale].find((post) => post.slug === slug);
}
