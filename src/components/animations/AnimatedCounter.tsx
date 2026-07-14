"use client";

import { useEffect, useRef, useState } from "react";

function formatValue(value: number, decimals: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  decimals = value % 1 === 0 ? 0 : 1,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const started = performance.now();
        const duration = 900;
        const animate = (now: number) => {
          const progress = Math.min((now - started) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(value * eased);
          if (progress < 1) requestAnimationFrame(animate);
        };
        setDisplay(0);
        requestAnimationFrame(animate);
        observer.disconnect();
      },
      { threshold: 0.5 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {prefix}
      {formatValue(display, decimals)}
      {suffix}
    </span>
  );
}
