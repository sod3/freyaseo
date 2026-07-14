import type { ReactNode } from "react";
import { cn } from "@/src/lib/cn";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("badge", className)}>{children}</span>;
}
