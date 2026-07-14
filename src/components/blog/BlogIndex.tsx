"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { blogPageCopy } from "@/src/content/blog";
import { getCommon } from "@/src/content/common";
import type { BlogPost, Locale } from "@/src/types";

export function BlogIndex({ posts, locale }: { posts: BlogPost[]; locale: Locale }) {
  const copy = blogPageCopy[locale];
  const common = getCommon(locale);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => ["All", ...Array.from(new Set(posts.map((post) => post.category)))], [posts]);
  const base = locale === "el" ? "/el/seo-blog/" : "/blog/";

  const filtered = posts.filter((post) => {
    const matchCategory = category === "All" || post.category === category;
    const haystack = `${post.title} ${post.excerpt} ${post.category}`.toLowerCase();
    return matchCategory && haystack.includes(query.toLowerCase());
  });

  const featured = posts[0];

  return (
    <>
      <section className="page-hero">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <p className="badge">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.text}</p>
        </div>
      </section>
      <section className="section-spacing">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <article className="featured-post">
            <Image src={featured.image} alt={featured.imageAlt} width={900} height={560} className="h-full w-full object-cover" />
            <div>
              <span>{copy.featured}</span>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
              <Link className="button button-primary" href={`${base}${featured.slug}/`}>
                {common.actions.readArticle}
              </Link>
            </div>
          </article>

          <div className="blog-controls">
            <div className="search-field">
              <Search className="h-5 w-5" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                aria-label={copy.searchPlaceholder}
              />
            </div>
            <div className="filter-row" aria-label={copy.categories}>
              {categories.map((item) => (
                <button key={item} type="button" className={item === category ? "active" : ""} onClick={() => setCategory(item)}>
                  {item === "All" && locale === "el" ? "Όλα" : item}
                </button>
              ))}
            </div>
          </div>

          {filtered.length ? (
            <div className="blog-preview-grid">
              {filtered.map((post) => (
                <article className="blog-card" key={post.slug}>
                  <Link href={`${base}${post.slug}/`} className="blog-image-wrap">
                    <Image src={post.image} alt={post.imageAlt} width={640} height={420} className="h-full w-full object-cover" />
                  </Link>
                  <div className="blog-card-body">
                    <span>{post.category} · {post.readingTime}</span>
                    <h3>
                      <Link href={`${base}${post.slug}/`}>{post.title}</Link>
                    </h3>
                    <p>{post.excerpt}</p>
                    <Link href={`${base}${post.slug}/`} className="card-link">
                      {common.actions.readArticle}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">{copy.empty}</div>
          )}

          <div className="newsletter-box">
            <h2>{copy.newsletterTitle}</h2>
            <p>{copy.newsletterText}</p>
          </div>
        </div>
      </section>
    </>
  );
}
