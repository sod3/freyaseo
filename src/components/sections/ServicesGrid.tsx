import Link from "next/link";
import { ArrowRight, Bot, ChartSpline, Settings2, Sparkles } from "lucide-react";
import type { ServiceKey, ServiceSummary } from "@/src/types";
import { Card } from "@/src/components/ui/Card";

const icons = {
  aiSeo: Sparkles,
  automation: Bot,
  reporting: ChartSpline,
  toolGeneration: Settings2,
} satisfies Record<ServiceKey, typeof Sparkles>;

export function ServicesGrid({ services }: { services: ServiceSummary[] }) {
  return (
    <div className="services-grid">
      {services.map((service) => {
        const Icon = icons[service.key];
        return (
          <Card className="service-card" key={service.key}>
            <div className="service-icon">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <p className="service-eyebrow">{service.eyebrow}</p>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <ul>
              {service.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
            <Link href={service.href} className="card-link">
              <span>{service.title}</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
