import type { Metadata } from "next";
import { CertificatesPage } from "@/src/components/pages/CertificatesPage";
import { certificatesPage } from "@/src/content/certificates";
import { pageMetadata } from "@/src/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: certificatesPage.el.seoTitle,
  description: certificatesPage.el.metaDescription,
  path: certificatesPage.el.path,
  locale: "el",
});

export default function Page() {
  return <CertificatesPage locale="el" />;
}
