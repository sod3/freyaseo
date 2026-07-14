import type { ReactNode } from "react";
import { cn } from "@/src/lib/cn";

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("section-spacing relative overflow-hidden", className)}>
      {children}
    </section>
  );
}
