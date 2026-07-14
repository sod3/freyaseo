import type { Metadata } from "next";
import { ServicePageTemplate } from "@/src/components/services/ServicePageTemplate";
import { getServicePage } from "@/src/content/services";
import { pageMetadata } from "@/src/lib/metadata";

const service = getServicePage("en", "toolGeneration");

export const metadata: Metadata = pageMetadata({
  title: "Custom SEO tools and workflow software | Freya SEO",
  description: service.description,
  path: service.href,
  locale: "en",
});

export default function Page() {
  return <ServicePageTemplate service={service} />;
}
