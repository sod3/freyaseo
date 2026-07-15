import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  generateWpCloneMetadata,
  getAllWpClonePagePaths,
  getCmsWpClonePageByPath,
  redirectFromCmsIfNeeded,
  WpClonePageForPath,
} from "@/src/lib/cms/wp-pages";

const directRoutePaths = new Set([
  "/",
  "/seo-marketing/",
  "/ai-seo-2/",
  "/automation/",
  "/report/",
  "/tool-generation/",
  "/certificates/",
  "/about/",
  "/blog/",
  "/contact-2/",
  "/el/seo-agency/",
  "/el/seo-marketing-2/",
  "/el/ai-seo-4/",
  "/el/automation-2/",
  "/el/report-2/",
  "/el/tool-generation-2/",
  "/el/certificates-seo/",
  "/el/about-us/",
  "/el/seo-blog/",
  "/el/lets-contact/",
]);

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
  return generateWpCloneMetadata(toPath(wp));
}

export default async function Page({ params }: PageProps) {
  const { wp = [] } = await params;
  const pathname = toPath(wp);

  await redirectFromCmsIfNeeded(pathname);
  const page = await getCmsWpClonePageByPath(pathname);

  if (!page) {
    notFound();
  }

  return <WpClonePageForPath pathname={pathname} />;
}
