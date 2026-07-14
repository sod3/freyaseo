import Image from "next/image";
import type { ToolItem } from "@/src/types";

export function ToolLogoMarquee({ title, tools }: { title: string; tools: ToolItem[] }) {
  const track = [...tools, ...tools];
  return (
    <div className="tool-marquee" aria-label={title}>
      <h2>{title}</h2>
      <div className="tool-marquee-window">
        <div className="tool-track">
          {track.map((tool, index) => (
            <div className="tool-logo-card" key={`${tool.name}-${index}`} aria-hidden={index >= tools.length}>
              <Image src={tool.logo} alt={index < tools.length ? tool.alt : ""} width={140} height={64} className="max-h-10 w-auto object-contain" />
              <span>{tool.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
