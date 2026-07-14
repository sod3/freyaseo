import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleTemplate } from "@/src/components/blog/ArticleTemplate";
import { blogPostsEn, getBlogPost } from "@/src/content/blog";
import { pageMetadata } from "@/src/lib/metadata";

export function generateStaticParams() {
  return blogPostsEn.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost("en", slug);
  if (!post) return {};
  return pageMetadata({
    title: post.seoTitle,
    description: post.metaDescription,
    path: `/blog/${post.slug}/`,
    locale: "en",
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost("en", slug);
  if (!post) notFound();
  return <ArticleTemplate post={post} />;
}
