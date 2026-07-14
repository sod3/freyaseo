import Link from "next/link";
import { ArrowRight, Bot, ChartSpline, Search, Sparkles } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { Container } from "@/src/components/ui/Container";

export function Hero({
  eyebrow,
  title,
  text,
  primary,
  secondary,
  primaryHref,
  secondaryHref,
  visualLink,
}: {
  eyebrow: string;
  title: string;
  text: string;
  primary: string;
  secondary: string;
  primaryHref: string;
  secondaryHref: string;
  visualLink: string;
}) {
  return (
    <section className="hero-section">
      <div className="hero-grid-bg" aria-hidden />
      <Container className="relative grid items-center gap-12 pt-28 lg:grid-cols-[1.02fr_.98fr] lg:pt-36">
        <div>
          <Badge>{eyebrow}</Badge>
          <h1 className="hero-title">{title}</h1>
          <p className="hero-copy">{text}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href={primaryHref}>{primary}</Button>
            <Button href={secondaryHref} variant="secondary">
              {secondary}
            </Button>
          </div>
        </div>

        <div className="hero-visual" aria-label="Freya SEO analytics preview">
          <div className="browser-top">
            <span />
            <span />
            <span />
            <p>freya.visibility/ai-search</p>
          </div>
          <div className="search-card">
            <Search className="h-5 w-5 text-[var(--primary)]" aria-hidden />
            <span>AI SEO visibility audit</span>
            <ArrowRight className="h-4 w-4" aria-hidden />
          </div>
          <div className="signal-chart">
            <div className="signal-line signal-line-a" />
            <div className="signal-line signal-line-b" />
            <div className="signal-line signal-line-c" />
          </div>
          <div className="hero-metrics">
            <div>
              <Sparkles className="h-5 w-5" aria-hidden />
              <strong>AI mentions</strong>
              <span>+148%</span>
            </div>
            <div>
              <ChartSpline className="h-5 w-5" aria-hidden />
              <strong>Organic leads</strong>
              <span>+62%</span>
            </div>
            <div>
              <Bot className="h-5 w-5" aria-hidden />
              <strong>Automations</strong>
              <span>12 live</span>
            </div>
          </div>
          <Link href={secondaryHref} className="hero-visual-link">
            {visualLink}
          </Link>
        </div>
      </Container>
    </section>
  );
}
