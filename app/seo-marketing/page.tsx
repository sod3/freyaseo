import type { Metadata } from "next";
import { ServicesLandingPage } from "@/src/components/pages/ServicesLandingPage";
import { servicesLanding } from "@/src/content/services";
import { pageMetadata } from "@/src/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: servicesLanding.en.seoTitle,
  description: servicesLanding.en.metaDescription,
  path: servicesLanding.en.path,
  locale: "en",
});

export default function Page() {
  return <ServicesLandingPage locale="en" />;
}
