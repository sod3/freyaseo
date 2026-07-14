import type { Metadata } from "next";
import { AboutPage } from "@/src/components/pages/AboutPage";
import { aboutEn } from "@/src/content/pages/about.en";
import { pageMetadata } from "@/src/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: aboutEn.seoTitle,
  description: aboutEn.metaDescription,
  path: aboutEn.path,
  locale: "en",
});

export default function Page() {
  return <AboutPage locale="en" />;
}
