import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleTemplate } from "@/src/components/blog/ArticleTemplate";
import { getCmsBlogPost, getCmsBlogSlugs } from "@/src/lib/cms/blog";
import { pageMetadata } from "@/src/lib/metadata";

export async function generateStaticParams() {
  const slugs = await getCmsBlogSlugs("el");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCmsBlogPost("el", slug);
  if (!post) return {};
  return pageMetadata({
    title: post.seoTitle,
    description: post.metaDescription,
    path: `/el/seo-blog/${post.slug}/`,
    locale: "el",
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getCmsBlogPost("el", slug);
  if (!post) notFound();
  return <ArticleTemplate post={post} />;
}
