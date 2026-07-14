import type { Metadata } from "next";
import { ServicePageTemplate } from "@/src/components/services/ServicePageTemplate";
import { getServicePage } from "@/src/content/services";
import { pageMetadata } from "@/src/lib/metadata";

const service = getServicePage("el", "automation");

export const metadata: Metadata = pageMetadata({
  title: "Υπηρεσίες αυτοματισμών AI για marketing workflows | Freya SEO",
  description: service.description,
  path: service.href,
  locale: "el",
});

export default function Page() {
  return <ServicePageTemplate service={service} />;
}
