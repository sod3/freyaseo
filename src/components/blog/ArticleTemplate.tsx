import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, UserRound } from "lucide-react";
import { Breadcrumbs } from "@/src/components/layout/Breadcrumbs";
import { JsonLd } from "@/src/components/layout/JsonLd";
import { articleJsonLd, breadcrumbJsonLd } from "@/src/lib/structured-data";
import { getCommon } from "@/src/content/common";
import type { BlogPost } from "@/src/types";
import { ArticleFeaturedImage } from "./ArticleFeaturedImage";
import styles from "./ArticleTemplate.module.css";

function formatPublicationDate(value: string, locale: BlogPost["locale"]) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function ArticleTemplate({ post }: { post: BlogPost }) {
  const locale = post.locale;
  const common = getCommon(locale);
  const base = locale === "el" ? "/el/seo-blog/" : "/blog/";
  const formattedDate = formatPublicationDate(post.publicationDate, locale);
  const author = post.author.trim();
  const category = post.category.trim();
  const readingTime = post.readingTime.trim();
  const excerpt = post.excerpt.trim();
  const articleLabel = locale === "el" ? "Άρθρο" : "Article";
  const insightsLabel = locale === "el" ? "Freya SEO Insights" : "Freya SEO Insights";
  const backLabel = locale === "el" ? "Πίσω στο Blog" : "Back to Blog";

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd(post, `${base}${post.slug}/`),
          breadcrumbJsonLd([
            { label: common.breadcrumbs.home, href: locale === "el" ? "/el/seo-agency/" : "/" },
            { label: common.breadcrumbs.blog, href: base },
            { label: post.title, href: `${base}${post.slug}/` },
          ]),
        ]}
      />

      <article className={styles.article}>
        <header className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroInner}>
            <Breadcrumbs
              locale={locale}
              items={[{ label: common.breadcrumbs.blog, href: base }, { label: post.title }]}
            />

            <div className={styles.eyebrowRow}>
              <span className={styles.eyebrow}>{category || insightsLabel}</span>
              {category ? <span className={styles.publication}>{insightsLabel}</span> : null}
            </div>

            <h1 className={styles.title}>{post.title}</h1>
            {excerpt ? <p className={styles.excerpt}>{excerpt}</p> : null}

            {author || formattedDate || readingTime ? (
              <div className={styles.meta} aria-label={locale === "el" ? "Στοιχεία άρθρου" : "Article details"}>
                {author ? (
                  <span className={styles.metaItem}>
                    <span className={styles.metaIcon} aria-hidden="true">
                      <UserRound />
                    </span>
                    <span>{author}</span>
                  </span>
                ) : null}
                {formattedDate ? (
                  <span className={styles.metaItem}>
                    <span className={styles.metaIcon} aria-hidden="true">
                      <CalendarDays />
                    </span>
                    <time dateTime={post.publicationDate}>{formattedDate}</time>
                  </span>
                ) : null}
                {readingTime ? (
                  <span className={styles.metaItem}>
                    <span className={styles.metaIcon} aria-hidden="true">
                      <Clock3 />
                    </span>
                    <span>{readingTime}</span>
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <div className={styles.featuredArea}>
          <div className={styles.featuredInner}>
            <ArticleFeaturedImage src={post.image} alt={post.imageAlt || post.title} title={post.title} />
          </div>
        </div>

        <section className={styles.readingArea} aria-label={articleLabel}>
          <div className={styles.contentInner}>
            <div className={styles.articleMarker} aria-hidden="true">
              <span>{articleLabel}</span>
              <i />
            </div>

            <div className={styles.prose}>
              {post.bodyHtml ? (
                <div dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
              ) : (
                post.content.map((section) => (
                  <section key={section.heading}>
                    <h2>{section.heading}</h2>
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </section>
                ))
              )}
            </div>

            <footer className={styles.articleFooter}>
              <Link className={styles.backLink} href={base}>
                <ArrowLeft aria-hidden="true" />
                <span>{backLabel}</span>
              </Link>
              <span className={styles.footerBrand}>{insightsLabel}</span>
            </footer>
          </div>
        </section>
      </article>
    </>
  );
}
