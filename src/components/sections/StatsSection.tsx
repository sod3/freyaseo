import { AnimatedCounter } from "@/src/components/animations/AnimatedCounter";
import { Container } from "@/src/components/ui/Container";
import type { Metric } from "@/src/types";

export function StatsSection({ stats }: { stats: Metric[] }) {
  return (
    <Container>
      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <strong>
              <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
            </strong>
            <span>{stat.label}</span>
            {stat.note ? <small>{stat.note}</small> : null}
          </div>
        ))}
      </div>
    </Container>
  );
}
