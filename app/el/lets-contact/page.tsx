import type { Metadata } from "next";
import { WpClonePage, metadataForWpClonePage } from "@/src/components/wp-clone/WpClonePage";
import { wpClonePages } from "@/src/content/wp-clone/pages";

const page = wpClonePages["el_contact"];

export const metadata: Metadata = metadataForWpClonePage(page);

export default function Page() {
  return <WpClonePage page={page} />;
}
