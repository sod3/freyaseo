import Image from "next/image";
import { Award, CheckCircle2 } from "lucide-react";
import { Hero } from "@/src/components/sections/Hero";
import { LogoMarquee } from "@/src/components/sections/LogoMarquee";
import { StatsSection } from "@/src/components/sections/StatsSection";
import { ServicesGrid } from "@/src/components/sections/ServicesGrid";
import { ProcessTimeline } from "@/src/components/sections/ProcessTimeline";
import { FAQSection } from "@/src/components/sections/FAQSection";
import { ContactCTA } from "@/src/components/sections/ContactCTA";
import { CertificatesPreview } from "@/src/components/sections/CertificatesPreview";
import { BlogPreview } from "@/src/components/sections/BlogPreview";
import { PerformanceDashboard } from "@/src/components/charts/PerformanceDashboard";
import { Container } from "@/src/components/ui/Container";
import { Section } from "@/src/components/ui/Section";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { Card } from "@/src/components/ui/Card";
import { getHomeContent } from "@/src/content/pages";
import { getServiceSummaries } from "@/src/content/services";
import { getBlogPosts } from "@/src/content/blog";
import { certificatesPage } from "@/src/content/certificates";
import { getCommon } from "@/src/content/common";
import type { Locale } from "@/src/types";
import { JsonLd } from "@/src/components/layout/JsonLd";
import { organizationJsonLd, personJsonLd } from "@/src/lib/structured-data";

export function HomePage({ locale }: { locale: Locale }) {
  const content = getHomeContent(locale);
  const services = getServiceSummaries(locale);
  const posts = getBlogPosts(locale);
  const common = getCommon(locale);

  return (
    <>
      <JsonLd data={[organizationJsonLd(locale), personJsonLd(locale)]} />
      <Hero
        eyebrow={content.hero.eyebrow}
        title={content.hero.title}
        text={content.hero.text}
        primary={content.hero.primary}
        secondary={content.hero.secondary}
        primaryHref={locale === "el" ? "/el/lets-contact/" : "/contact-2/"}
        secondaryHref={locale === "el" ? "/el/seo-marketing-2/" : "/seo-marketing/"}
        visualLink={locale === "el" ? "Δείτε το growth system" : "Explore the growth system"}
      />
      <div className="trust-band">
        <Container>
          <p>{content.announcement}</p>
          <LogoMarquee items={content.trustLogos} />
        </Container>
      </div>
      <StatsSection stats={content.stats} />

      <Section>
        <Container className="grid items-center gap-10 lg:grid-cols-[.92fr_1.08fr]">
          <div className="portrait-panel">
            <Image
              src="/images/home/pavlina.webp"
              alt="Pavlina Hörmann, SEO Manager and AI marketer"
              width={620}
              height={760}
              className="h-full w-full object-cover"
            />
            <div className="portrait-badge">
              <Award className="h-5 w-5" aria-hidden />
              <span>SEO Manager</span>
            </div>
          </div>
          <div>
            <SectionHeading eyebrow={content.about.eyebrow} title={content.about.title} text={content.about.text} />
            <div className="highlight-list">
              {content.about.highlights.map((item) => (
                <span key={item}>
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <Section className="section-muted">
        <Container>
          <SectionHeading
            eyebrow={locale === "el" ? "Υπηρεσίες" : "Services"}
            title={locale === "el" ? "Τι προσφέρει η Freya SEO" : "What Freya SEO offers"}
            text={
              locale === "el"
                ? "Τέσσερις υπηρεσίες που καλύπτουν visibility, workflows, reporting και custom εργαλεία."
                : "Four services covering visibility, workflows, reporting and custom tools."
            }
            align="center"
          />
          <ServicesGrid services={services} />
        </Container>
      </Section>

      <Section>
        <Container className="grid items-center gap-10 lg:grid-cols-[.74fr_1.26fr]">
          <SectionHeading eyebrow={content.dashboard.eyebrow} title={content.dashboard.title} text={content.dashboard.text} />
          <PerformanceDashboard
            title={locale === "el" ? "Organic growth dashboard" : "Organic growth dashboard"}
            text={content.dashboard.text}
            labels={{
              eyebrow: locale === "el" ? "Demo μοντέλο απόδοσης" : "Demo performance model",
              status: locale === "el" ? "Έτοιμο για σύνδεση" : "Live-ready",
              area: locale === "el" ? "Organic traffic και leads" : "Organic traffic and leads",
              bars: locale === "el" ? "Μείγμα ορατότητας" : "Visibility mix",
            }}
          />
        </Container>
      </Section>

      <Section className="section-muted">
        <Container>
          <SectionHeading eyebrow={content.why.eyebrow} title={content.why.title} align="center" />
          <div className="benefit-grid">
            {content.why.items.map((item) => (
              <Card key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading eyebrow={content.process.eyebrow} title={content.process.title} align="center" />
          <ProcessTimeline steps={content.process.steps} />
        </Container>
      </Section>

      <Section className="section-muted">
        <Container className="grid items-start gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <SectionHeading
            eyebrow={locale === "el" ? "Πιστοποιήσεις" : "Certificates"}
            title={locale === "el" ? "Συνεχής μάθηση από Google, IBM και Semrush." : "Continuous learning from Google, IBM and Semrush."}
          />
          <CertificatesPreview href={certificatesPage[locale].path} label={common.actions.viewCertificate} />
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading
            eyebrow="Blog"
            title={locale === "el" ? "Τελευταίες SEO σκέψεις" : "Latest SEO thinking"}
            text={locale === "el" ? "Οδηγοί για SEO, AI search και analytics." : "Guides for SEO, AI search and analytics."}
            align="center"
          />
          <BlogPreview posts={posts} locale={locale} />
        </Container>
      </Section>

      <FAQSection eyebrow={content.faq.eyebrow} title={content.faq.title} intro={content.faq.intro} items={content.faq.items} />
      <ContactCTA
        title={content.cta.title}
        text={content.cta.text}
        label={content.cta.label}
        href={locale === "el" ? "/el/lets-contact/" : "/contact-2/"}
      />
    </>
  );
}
