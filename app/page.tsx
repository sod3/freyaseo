import type { Metadata } from "next";
import { HomePage } from "@/src/components/pages/HomePage";
import { homeEn } from "@/src/content/pages/home.en";
import { pageMetadata } from "@/src/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: homeEn.seoTitle,
  description: homeEn.metaDescription,
  path: homeEn.path,
  locale: "en",
});

export default function Page() {
  return <HomePage locale="en" />;
}
