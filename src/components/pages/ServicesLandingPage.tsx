import { JsonLd } from "@/src/components/layout/JsonLd";
import { ContactCTA } from "@/src/components/sections/ContactCTA";
import { FAQSection } from "@/src/components/sections/FAQSection";
import { ProcessTimeline } from "@/src/components/sections/ProcessTimeline";
import { ServicesGrid } from "@/src/components/sections/ServicesGrid";
import { StatsSection } from "@/src/components/sections/StatsSection";
import { Badge } from "@/src/components/ui/Badge";
import { Card } from "@/src/components/ui/Card";
import { Container } from "@/src/components/ui/Container";
import { Section } from "@/src/components/ui/Section";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { getHomeContent } from "@/src/content/pages";
import { getServiceSummaries, servicesLanding } from "@/src/content/services";
import { organizationJsonLd } from "@/src/lib/structured-data";
import type { Locale } from "@/src/types";

export function ServicesLandingPage({ locale }: { locale: Locale }) {
  const content = servicesLanding[locale];
  const home = getHomeContent(locale);
  return (
    <>
      <JsonLd data={organizationJsonLd(locale)} />
      <section className="page-hero">
        <Container>
          <Badge>{content.eyebrow}</Badge>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
        </Container>
      </section>
      <StatsSection stats={home.stats.slice(0, 3)} />
      <Section>
        <Container>
          <SectionHeading
            eyebrow={content.eyebrow}
            title={locale === "el" ? "Τέσσερις δυνατότητες, μία καθαρή στρατηγική." : "Four capabilities, one clear growth system."}
            align="center"
          />
          <ServicesGrid services={getServiceSummaries(locale)} />
        </Container>
      </Section>
      <Section className="section-muted">
        <Container className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <SectionHeading title={content.comparisonTitle} text={content.comparisonText} />
          <div className="capability-grid">
            {getServiceSummaries(locale).map((service, index) => (
              <Card key={service.key}>
                <span className="capability-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
      <Section>
        <Container>
          <SectionHeading title={locale === "el" ? "Πώς δουλεύουμε" : "How the work flows"} align="center" />
          <ProcessTimeline steps={home.process.steps} />
        </Container>
      </Section>
      <FAQSection eyebrow="FAQ" title={home.faq.title} intro={home.faq.intro} items={home.faq.items} />
      <ContactCTA title={content.ctaTitle} text={content.ctaText} label={content.ctaLabel} href={locale === "el" ? "/el/lets-contact/" : "/contact-2/"} />
    </>
  );
}
