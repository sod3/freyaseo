import { Badge } from "./Badge";
import { cn } from "@/src/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  text,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("section-heading", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <Badge>{eyebrow}</Badge> : null}
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
  );
}
