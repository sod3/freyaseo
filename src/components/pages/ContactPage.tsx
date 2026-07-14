import { Mail, MessageSquareText, Timer } from "lucide-react";
import { ContactForm } from "@/src/components/pages/ContactForm";
import { JsonLd } from "@/src/components/layout/JsonLd";
import { Badge } from "@/src/components/ui/Badge";
import { Card } from "@/src/components/ui/Card";
import { Container } from "@/src/components/ui/Container";
import { Section } from "@/src/components/ui/Section";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { getCommon } from "@/src/content/common";
import { getServiceSummaries } from "@/src/content/services";
import { organizationJsonLd } from "@/src/lib/structured-data";
import type { Locale } from "@/src/types";

export function ContactPage({ locale }: { locale: Locale }) {
  const common = getCommon(locale);
  const copy = common.contact;

  return (
    <>
      <JsonLd data={organizationJsonLd(locale)} />
      <section className="page-hero">
        <Container>
          <Badge>{copy.heroEyebrow}</Badge>
          <h1>{copy.title}</h1>
          <p>{copy.text}</p>
        </Container>
      </section>
      <Section>
        <Container className="grid gap-8 lg:grid-cols-[.82fr_1.18fr]">
          <div className="contact-info-grid">
            <Card>
              <Mail className="h-6 w-6 text-[var(--primary)]" aria-hidden />
              <h2>{copy.infoTitle}</h2>
              <p>{copy.infoText}</p>
            </Card>
            <Card>
              <Timer className="h-6 w-6 text-[var(--primary)]" aria-hidden />
              <h2>{locale === "el" ? "Χρόνος απάντησης" : "Response time"}</h2>
              <p>{copy.responseTime}</p>
            </Card>
            <Card>
              <MessageSquareText className="h-6 w-6 text-[var(--primary)]" aria-hidden />
              <h2>{locale === "el" ? "Πώς δουλεύει" : "How it works"}</h2>
              <p>{locale === "el" ? "Διαβάζουμε κάθε μήνυμα και απαντάμε με ουσιαστική επόμενη κίνηση." : "Every message is read carefully and answered with a thoughtful next step."}</p>
            </Card>
          </div>
          <ContactForm locale={locale} />
        </Container>
      </Section>
      <Section className="section-muted">
        <Container>
          <SectionHeading
            eyebrow={locale === "el" ? "Επιλέξτε υπηρεσία" : "Choose a service"}
            title={locale === "el" ? "Δεν χρειάζεται να ξέρετε ακριβώς τι χρειάζεστε." : "You do not need to know exactly what you need yet."}
            text={locale === "el" ? "Αυτές οι κάρτες βοηθούν να ξεκινήσει η συζήτηση από το σωστό σημείο." : "These cards simply help the conversation start in the right place."}
            align="center"
          />
          <div className="services-grid">
            {getServiceSummaries(locale).map((service) => (
              <Card key={service.key}>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
