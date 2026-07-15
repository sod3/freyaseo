import type { Metadata } from "next";
import { generateWpCloneMetadata, WpClonePageForPath } from "@/src/lib/cms/wp-pages";

const pathname = "/el/report-2/";

export function generateMetadata(): Promise<Metadata> {
  return generateWpCloneMetadata(pathname);
}

export default async function Page() {
  return <WpClonePageForPath pathname={pathname} />;
}
