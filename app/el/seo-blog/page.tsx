import type { Metadata } from "next";
import { BlogPage } from "@/src/components/pages/BlogPage";
import { blogPageCopy } from "@/src/content/blog";
import { pageMetadata } from "@/src/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: blogPageCopy.el.seoTitle,
  description: blogPageCopy.el.metaDescription,
  path: blogPageCopy.el.path,
  locale: "el",
});

export default function Page() {
  return <BlogPage locale="el" />;
}
