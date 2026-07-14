import type { ProcessStep } from "@/src/types";

export function ProcessTimeline({ steps }: { steps: ProcessStep[] }) {
  return (
    <div className="process-grid">
      {steps.map((step, index) => (
        <div className="process-step" key={step.title}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </div>
      ))}
    </div>
  );
}
