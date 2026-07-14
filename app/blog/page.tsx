import type { Metadata } from "next";
import { BlogPage } from "@/src/components/pages/BlogPage";
import { blogPageCopy } from "@/src/content/blog";
import { pageMetadata } from "@/src/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: blogPageCopy.en.seoTitle,
  description: blogPageCopy.en.metaDescription,
  path: blogPageCopy.en.path,
  locale: "en",
});

export default function Page() {
  return <BlogPage locale="en" />;
}
