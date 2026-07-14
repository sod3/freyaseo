import type { Metadata } from "next";
import { CertificatesPage } from "@/src/components/pages/CertificatesPage";
import { certificatesPage } from "@/src/content/certificates";
import { pageMetadata } from "@/src/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: certificatesPage.en.seoTitle,
  description: certificatesPage.en.metaDescription,
  path: certificatesPage.en.path,
  locale: "en",
});

export default function Page() {
  return <CertificatesPage locale="en" />;
}
