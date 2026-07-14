import { Accordion } from "@/src/components/ui/Accordion";
import { Container } from "@/src/components/ui/Container";
import { Section } from "@/src/components/ui/Section";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import type { FAQ } from "@/src/types";

export function FAQSection({
  eyebrow,
  title,
  intro,
  items,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  items: FAQ[];
}) {
  return (
    <Section className="section-muted">
      <Container className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
        <SectionHeading eyebrow={eyebrow} title={title} text={intro} />
        <Accordion items={items} />
      </Container>
    </Section>
  );
}
