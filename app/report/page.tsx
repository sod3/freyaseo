import type { Metadata } from "next";
import { ServicePageTemplate } from "@/src/components/services/ServicePageTemplate";
import { getServicePage } from "@/src/content/services";
import { pageMetadata } from "@/src/lib/metadata";

const service = getServicePage("en", "reporting");

export const metadata: Metadata = pageMetadata({
  title: "SEO reporting dashboards and analytics | Freya SEO",
  description: service.description,
  path: service.href,
  locale: "en",
});

export default function Page() {
  return <ServicePageTemplate service={service} />;
}
