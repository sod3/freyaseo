import type { Metadata } from "next";
import { ContactPage } from "@/src/components/pages/ContactPage";
import { pageMetadata } from "@/src/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Επικοινωνία με τη Freya SEO | Δωρεάν SEO συζήτηση",
  description: "Επικοινωνήστε με τη Freya SEO για AI SEO, αυτοματισμούς, αναφορές ή custom SEO εργαλεία.",
  path: "/el/lets-contact/",
  locale: "el",
});

export default function Page() {
  return <ContactPage locale="el" />;
}
