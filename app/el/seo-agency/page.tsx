import type { Metadata } from "next";
import { HomePage } from "@/src/components/pages/HomePage";
import { homeEl } from "@/src/content/pages/home.el";
import { pageMetadata } from "@/src/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: homeEl.seoTitle,
  description: homeEl.metaDescription,
  path: homeEl.path,
  locale: "el",
});

export default function Page() {
  return <HomePage locale="el" />;
}
