import { Button } from "@/src/components/ui/Button";
import { Container } from "@/src/components/ui/Container";
import { Section } from "@/src/components/ui/Section";

export function ContactCTA({
  title,
  text,
  label,
  href,
}: {
  title: string;
  text: string;
  label: string;
  href: string;
}) {
  return (
    <Section>
      <Container>
        <div className="cta-band">
          <div>
            <p>Freya SEO</p>
            <h2>{title}</h2>
            <span>{text}</span>
          </div>
          <Button href={href}>{label}</Button>
        </div>
      </Container>
    </Section>
  );
}
