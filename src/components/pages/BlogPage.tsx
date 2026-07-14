import { BlogIndex } from "@/src/components/blog/BlogIndex";
import { JsonLd } from "@/src/components/layout/JsonLd";
import { getBlogPosts } from "@/src/content/blog";
import { organizationJsonLd } from "@/src/lib/structured-data";
import type { Locale } from "@/src/types";

export function BlogPage({ locale }: { locale: Locale }) {
  return (
    <>
      <JsonLd data={organizationJsonLd(locale)} />
      <BlogIndex posts={getBlogPosts(locale)} locale={locale} />
    </>
  );
}
