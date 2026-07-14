import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { JsonLd } from "@/src/components/layout/JsonLd";
import { ContactCTA } from "@/src/components/sections/ContactCTA";
import { CertificatesPreview } from "@/src/components/sections/CertificatesPreview";
import { Badge } from "@/src/components/ui/Badge";
import { Card } from "@/src/components/ui/Card";
import { Container } from "@/src/components/ui/Container";
import { Section } from "@/src/components/ui/Section";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { getAboutContent } from "@/src/content/pages";
import { certificatesPage } from "@/src/content/certificates";
import { personJsonLd } from "@/src/lib/structured-data";
import type { Locale } from "@/src/types";

export function AboutPage({ locale }: { locale: Locale }) {
  const content = getAboutContent(locale);

  return (
    <>
      <JsonLd data={personJsonLd(locale)} />
      <section className="page-hero">
        <Container className="grid items-center gap-10 lg:grid-cols-[1fr_.82fr]">
          <div>
            <Badge>{content.eyebrow}</Badge>
            <h1>{content.title}</h1>
            <p>{content.intro}</p>
          </div>
          <div className="portrait-panel portrait-panel-small">
            <Image
              src="/images/home/pavlina-alt.jpeg"
              alt="Pavlina Hörmann portrait"
              width={600}
              height={720}
              className="h-full w-full object-cover"
            />
          </div>
        </Container>
      </section>

      <Section>
        <Container className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <SectionHeading eyebrow={locale === "el" ? "Ιστορία" : "Story"} title={locale === "el" ? "Η εμπειρία πίσω από τη Freya." : "The experience behind Freya."} />
          <div className="prose-block">
            {content.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="section-muted">
        <Container className="grid gap-8 lg:grid-cols-2">
          <Card>
            <h2>{locale === "el" ? "Αξίες" : "Values"}</h2>
            <div className="highlight-list mt-5">
              {content.values.map((value) => (
                <span key={value}>
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  {value}
                </span>
              ))}
            </div>
          </Card>
          <Card>
            <h2>{locale === "el" ? "Δεξιότητες" : "Skills"}</h2>
            <div className="tag-cloud">
              {content.skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </Card>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading title={locale === "el" ? "Ορόσημα" : "Milestones"} align="center" />
          <div className="timeline-grid">
            {content.timeline.map((item) => (
              <Card key={item.year}>
                <span className="capability-index">{item.year}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="section-muted">
        <Container className="grid items-start gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <SectionHeading title={locale === "el" ? "Πιστοποιήσεις και συνεχής μάθηση" : "Certifications and continuous learning"} />
          <CertificatesPreview href={certificatesPage[locale].path} label={certificatesPage[locale].ctaLabel} />
        </Container>
      </Section>

      <ContactCTA title={content.ctaTitle} text={content.ctaText} label={content.ctaLabel} href={locale === "el" ? "/el/lets-contact/" : "/contact-2/"} />
    </>
  );
}
