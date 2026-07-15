import type { Metadata } from "next";
import { generateWpCloneMetadata, WpClonePageForPath } from "@/src/lib/cms/wp-pages";

const pathname = "/about/";

export function generateMetadata(): Promise<Metadata> {
  return generateWpCloneMetadata(pathname);
}

export default async function Page() {
  return <WpClonePageForPath pathname={pathname} />;
}
