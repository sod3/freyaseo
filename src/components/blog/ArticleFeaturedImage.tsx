"use client";

/* eslint-disable @next/next/no-img-element -- CMS images can use arbitrary CDN hosts; native images avoid host-specific optimizer failures. */

import { ImageOff } from "lucide-react";
import { useState } from "react";
import styles from "./ArticleTemplate.module.css";

function normalizeImageSource(value: string) {
  const source = value.trim();
  if (!source || source === "/og.png") return "";
  if (source.startsWith("//")) return `https:${source}`;
  if (/^(https?:|data:|blob:)/i.test(source)) return source;
  if (source.startsWith("/")) return source;
  return `/${source.replace(/^\.\//, "")}`;
}

export function ArticleFeaturedImage({ src, alt, title }: { src: string; alt: string; title: string }) {
  const normalizedSource = normalizeImageSource(src);
  const [failedSource, setFailedSource] = useState("");
  const failed = Boolean(normalizedSource && failedSource === normalizedSource);

  if (!normalizedSource || failed) {
    return (
      <div className={`${styles.mediaFrame} ${styles.mediaFallback}`} role="img" aria-label={alt}>
        <span className={styles.fallbackOrb} aria-hidden="true" />
        <span className={styles.fallbackIcon} aria-hidden="true">
          <ImageOff />
        </span>
        <span className={styles.fallbackBrand}>Freya SEO</span>
        <strong>{title}</strong>
      </div>
    );
  }

  return (
    <figure className={styles.mediaFrame}>
      <img className={styles.imageBackdrop} src={normalizedSource} alt="" aria-hidden="true" />
      <span className={styles.imageWash} aria-hidden="true" />
      {/* A native image keeps CMS/CDN URLs working without host-specific optimizer configuration. */}
      <img
        className={styles.featuredImage}
        src={normalizedSource}
        alt={alt}
        width={1440}
        height={810}
        decoding="async"
        fetchPriority="high"
        onError={() => setFailedSource(normalizedSource)}
      />
    </figure>
  );
}
