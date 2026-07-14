import { CheckCircle2 } from "lucide-react";
import { Breadcrumbs } from "@/src/components/layout/Breadcrumbs";
import { JsonLd } from "@/src/components/layout/JsonLd";
import { PerformanceDashboard } from "@/src/components/charts/PerformanceDashboard";
import { ContactCTA } from "@/src/components/sections/ContactCTA";
import { FAQSection } from "@/src/components/sections/FAQSection";
import { ProcessTimeline } from "@/src/components/sections/ProcessTimeline";
import { StatsSection } from "@/src/components/sections/StatsSection";
import { ToolLogoMarquee } from "@/src/components/services/ToolLogoMarquee";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { Container } from "@/src/components/ui/Container";
import { Section } from "@/src/components/ui/Section";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { getCommon } from "@/src/content/common";
import { breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from "@/src/lib/structured-data";
import type { ServicePageData } from "@/src/types";

export function ServicePageTemplate({ service }: { service: ServicePageData }) {
  const common = getCommon(service.locale);

  return (
    <>
      <JsonLd
        data={[
          serviceJsonLd(service),
          faqJsonLd(service.faqs),
          breadcrumbJsonLd([
            { label: common.breadcrumbs.home, href: service.locale === "el" ? "/el/seo-agency/" : "/" },
            { label: common.breadcrumbs.services, href: service.locale === "el" ? "/el/seo-marketing-2/" : "/seo-marketing/" },
            { label: service.eyebrow, href: service.href },
          ]),
        ]}
      />
      <section className="page-hero">
        <Container>
          <Breadcrumbs locale={service.locale} items={[{ label: common.breadcrumbs.services, href: service.locale === "el" ? "/el/seo-marketing-2/" : "/seo-marketing/" }, { label: service.eyebrow }]} />
          <div className="page-hero-grid">
            <div>
              <Badge>{service.eyebrow}</Badge>
              <h1>{service.title}</h1>
              <p>{service.description}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button href={service.locale === "el" ? "/el/lets-contact/" : "/contact-2/"}>{service.ctaLabel}</Button>
                <Button href={service.locale === "el" ? "/el/certificates-seo/" : "/certificates/"} variant="secondary">
                  {service.locale === "el" ? "Πιστοποιήσεις" : "See Certificates"}
                </Button>
              </div>
            </div>
            <div className="service-hero-panel">
              <PerformanceDashboard
                title={service.dashboardTitle}
                text={service.dashboardText}
                labels={{
                  eyebrow: service.locale === "el" ? "Demo μοντέλο υπηρεσίας" : "Demo service model",
                  status: service.locale === "el" ? "Έτοιμο για σύνδεση" : "Live-ready",
                  area: service.locale === "el" ? "Τάση απόδοσης" : "Performance trend",
                  bars: service.locale === "el" ? "Δείκτες visibility" : "Visibility signals",
                }}
              />
            </div>
          </div>
        </Container>
      </section>

      <StatsSection stats={service.heroMetrics} />

      <Section>
        <Container className="grid gap-10 lg:grid-cols-[.82fr_1.18fr]">
          <SectionHeading eyebrow={service.eyebrow} title={service.overviewTitle} text={service.overviewText} />
          <div className="offer-grid">
            {service.offers.map((offer) => (
              <Card key={offer.title}>
                <CheckCircle2 className="mb-4 h-6 w-6 text-[var(--primary)]" aria-hidden />
                <h3>{offer.title}</h3>
                <p>{offer.text}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="section-muted">
        <Container>
          <SectionHeading eyebrow={service.eyebrow} title={service.benefitsTitle} text={service.benefitsIntro} align="center" />
          <div className="benefit-grid">
            {service.benefits.map((benefit) => (
              <Card key={benefit.title}>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <ToolLogoMarquee title={service.toolsTitle} tools={service.tools} />
        </Container>
      </Section>

      <Section className="section-muted">
        <Container>
          <SectionHeading title={service.processTitle} align="center" />
          <ProcessTimeline steps={service.process} />
        </Container>
      </Section>

      <FAQSection eyebrow="FAQ" title={service.faqsTitle} intro={service.faqsIntro} items={service.faqs} />
      <ContactCTA title={service.ctaTitle} text={service.ctaText} label={service.ctaLabel} href={service.locale === "el" ? "/el/lets-contact/" : "/contact-2/"} />
    </>
  );
}
