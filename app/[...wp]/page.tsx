import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleTemplate } from "@/src/components/blog/ArticleTemplate";
import { getCmsBlogPost, parseCmsBlogPath } from "@/src/lib/cms/blog";
import { getLanguageSettings } from "@/src/lib/cms/languages";
import {
  generateWpCloneMetadata,
  getAllWpClonePagePaths,
  getCmsWpClonePageByPath,
  redirectFromCmsIfNeeded,
  WpClonePageForPath,
} from "@/src/lib/cms/wp-pages";
import { allStaticRoutes } from "@/src/content/route-map";
import { pageMetadata } from "@/src/lib/metadata";

const directRoutePaths = new Set(allStaticRoutes);

type PageProps = {
  params: Promise<{
    wp?: string[];
  }>;
};

function toPath(segments: string[] = []) {
  if (!segments.length) {
    return "/";
  }
  return `/${segments.map((segment) => encodeURIComponent(segment)).join("/")}/`;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateStaticParams() {
  const paths = await getAllWpClonePagePaths();

  return paths
    .filter((path) => !directRoutePaths.has(path))
    .map((path) => ({
      wp: path.split("/").filter(Boolean).map(safeDecode),
    }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { wp = [] } = await params;
  const pathname = toPath(wp);
  const languageSettings = await getLanguageSettings();
  const blogPath = parseCmsBlogPath(pathname, languageSettings);

  if (blogPath) {
    const locale = blogPath.locale === "el" ? "el" : "en";
    const post = await getCmsBlogPost(locale, blogPath.slug);
    if (post) {
      return pageMetadata({
        title: post.seoTitle,
        description: post.metaDescription,
        path: pathname,
        locale,
      });
    }
  }

  return generateWpCloneMetadata(pathname);
}

export default async function Page({ params }: PageProps) {
  const { wp = [] } = await params;
  const pathname = toPath(wp);

  await redirectFromCmsIfNeeded(pathname);
  const languageSettings = await getLanguageSettings();
  const blogPath = parseCmsBlogPath(pathname, languageSettings);

  if (blogPath) {
    const locale = blogPath.locale === "el" ? "el" : "en";
    const post = await getCmsBlogPost(locale, blogPath.slug);
    if (!post) notFound();
    return <ArticleTemplate post={post} />;
  }

  const page = await getCmsWpClonePageByPath(pathname);

  if (!page) {
    notFound();
  }

  return <WpClonePageForPath pathname={pathname} />;
}
