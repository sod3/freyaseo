import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/src/lib/cn";

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  showArrow?: boolean;
};

export function Button({ href, children, className, variant = "primary", showArrow = true, ...props }: ButtonProps) {
  return (
    <Link href={href} className={cn("button", `button-${variant}`, className)} {...props}>
      <span>{children}</span>
      {showArrow ? <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden /> : null}
    </Link>
  );
}
