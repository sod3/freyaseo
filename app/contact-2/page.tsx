import type { Metadata } from "next";
import { ContactPage } from "@/src/components/pages/ContactPage";
import { pageMetadata } from "@/src/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Contact Freya SEO | Free SEO consultation",
  description: "Contact Freya SEO for AI SEO, automation, reporting or custom SEO tools.",
  path: "/contact-2/",
  locale: "en",
});

export default function Page() {
  return <ContactPage locale="en" />;
}
