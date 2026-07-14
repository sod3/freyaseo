"use client";

import { useMemo, useState } from "react";
import { Award, ExternalLink } from "lucide-react";
import { Modal } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { Card } from "@/src/components/ui/Card";
import { Container } from "@/src/components/ui/Container";
import { Section } from "@/src/components/ui/Section";
import { certificates, certificatesPage } from "@/src/content/certificates";
import type { Certificate, Locale } from "@/src/types";

export function CertificatesPage({ locale }: { locale: Locale }) {
  const copy = certificatesPage[locale];
  const [category, setCategory] = useState(copy.allLabel);
  const [active, setActive] = useState<Certificate | null>(null);
  const categories = useMemo(() => [copy.allLabel, ...Array.from(new Set(certificates.map((item) => item.category)))], [copy.allLabel]);
  const visible = category === copy.allLabel ? certificates : certificates.filter((item) => item.category === category);

  return (
    <>
      <section className="page-hero">
        <Container>
          <Badge>{copy.eyebrow}</Badge>
          <h1>{copy.title}</h1>
          <p>{copy.text}</p>
        </Container>
      </section>
      <Section>
        <Container>
          <div className="filter-row" aria-label={copy.categoriesLabel}>
            {categories.map((item) => (
              <button key={item} type="button" className={item === category ? "active" : ""} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="certificate-grid">
            {visible.map((certificate) => (
              <Card className="certificate-card" key={certificate.title}>
                <button type="button" className="certificate-preview" onClick={() => setActive(certificate)}>
                  <Award className="h-10 w-10 text-[var(--primary)]" aria-hidden />
                  <span>{certificate.issuer}</span>
                  <strong>{certificate.title}</strong>
                </button>
                <div>
                  <p>{certificate.category}</p>
                  {certificate.date ? <small>{certificate.date}</small> : null}
                </div>
                <button type="button" className="button button-secondary justify-center" onClick={() => setActive(certificate)}>
                  {locale === "el" ? "Προβολή Πιστοποιητικού" : "View Certificate"}
                </button>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
      <Section className="section-muted">
        <Container>
          <div className="cta-band">
            <div>
              <p>Freya SEO</p>
              <h2>{copy.ctaTitle}</h2>
              <span>{copy.ctaText}</span>
            </div>
            <Button href={locale === "el" ? "/el/lets-contact/" : "/contact-2/"}>{copy.ctaLabel}</Button>
          </div>
        </Container>
      </Section>
      <Modal open={Boolean(active)} title={copy.modalTitle} onClose={() => setActive(null)}>
        {active ? (
          <div className="certificate-modal-card">
            <Award className="h-12 w-12 text-[var(--primary)]" aria-hidden />
            <p>{active.issuer}</p>
            <h3>{active.title}</h3>
            <span>{active.category}{active.date ? ` · ${active.date}` : ""}</span>
            {active.verificationUrl ? (
              <a className="button button-primary mt-6 justify-center" href={active.verificationUrl} target="_blank" rel="noreferrer">
                {locale === "el" ? "Άνοιγμα Επαλήθευσης" : "Open Verification"}
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
