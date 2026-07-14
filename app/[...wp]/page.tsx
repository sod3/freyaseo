import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WpClonePage, metadataForWpClonePage } from "@/src/components/wp-clone/WpClonePage";
import { getWpClonePageByPath, wpClonePagesByPath } from "@/src/content/wp-clone/pages";

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

export function generateStaticParams() {
  return Object.keys(wpClonePagesByPath)
    .filter((path) => !directRoutePaths.has(path))
    .map((path) => ({
      wp: path.split("/").filter(Boolean).map(safeDecode),
    }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { wp = [] } = await params;
  const page = getWpClonePageByPath(toPath(wp));

  if (!page) {
    return {};
  }

  return metadataForWpClonePage(page);
}

export default async function Page({ params }: PageProps) {
  const { wp = [] } = await params;
  const page = getWpClonePageByPath(toPath(wp));

  if (!page) {
    notFound();
  }

  return <WpClonePage page={page} />;
}
