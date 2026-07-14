import type { ReactNode } from "react";
import { cn } from "@/src/lib/cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("surface-card", className)}>{children}</div>;
}
