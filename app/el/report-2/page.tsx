import type { Metadata } from "next";
import { ServicePageTemplate } from "@/src/components/services/ServicePageTemplate";
import { getServicePage } from "@/src/content/services";
import { pageMetadata } from "@/src/lib/metadata";

const service = getServicePage("el", "reporting");

export const metadata: Metadata = pageMetadata({
  title: "SEO αναφορές, dashboards και analytics | Freya SEO",
  description: service.description,
  path: service.href,
  locale: "el",
});

export default function Page() {
  return <ServicePageTemplate service={service} />;
}
