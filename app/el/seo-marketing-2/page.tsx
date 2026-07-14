import type { Metadata } from "next";
import { ServicesLandingPage } from "@/src/components/pages/ServicesLandingPage";
import { servicesLanding } from "@/src/content/services";
import { pageMetadata } from "@/src/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: servicesLanding.el.seoTitle,
  description: servicesLanding.el.metaDescription,
  path: servicesLanding.el.path,
  locale: "el",
});

export default function Page() {
  return <ServicesLandingPage locale="el" />;
}
