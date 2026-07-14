import type { Metadata } from "next";
import { AboutPage } from "@/src/components/pages/AboutPage";
import { aboutEl } from "@/src/content/pages/about.el";
import { pageMetadata } from "@/src/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: aboutEl.seoTitle,
  description: aboutEl.metaDescription,
  path: aboutEl.path,
  locale: "el",
});

export default function Page() {
  return <AboutPage locale="el" />;
}
