import type { Metadata } from "next";
import { generateWpCloneMetadata, WpClonePageForPath } from "@/src/lib/cms/wp-pages";

const pathname = "/certificates/";

export function generateMetadata(): Promise<Metadata> {
  return generateWpCloneMetadata(pathname);
}

export default async function Page() {
  return <WpClonePageForPath pathname={pathname} />;
}
