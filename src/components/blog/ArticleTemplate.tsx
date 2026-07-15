import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/src/components/layout/Breadcrumbs";
import { JsonLd } from "@/src/components/layout/JsonLd";
import { Container } from "@/src/components/ui/Container";
import { Section } from "@/src/components/ui/Section";
import { Badge } from "@/src/components/ui/Badge";
import { articleJsonLd, breadcrumbJsonLd } from "@/src/lib/structured-data";
import { getCommon } from "@/src/content/common";
import type { BlogPost } from "@/src/types";

export function ArticleTemplate({ post }: { post: BlogPost }) {
  const locale = post.locale;
  const common = getCommon(locale);
  const base = locale === "el" ? "/el/seo-blog/" : "/blog/";

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
      <article>
        <section className="page-hero article-hero">
          <Container>
            <Breadcrumbs locale={locale} items={[{ label: common.breadcrumbs.blog, href: base }, { label: post.title }]} />
            <Badge>{post.category}</Badge>
            <h1>{post.title}</h1>
            <p>{post.excerpt}</p>
            <div className="article-meta">
              <span>{post.author}</span>
              <span>{new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-US", { dateStyle: "medium" }).format(new Date(post.publicationDate))}</span>
              <span>{post.readingTime}</span>
            </div>
          </Container>
        </section>
        <Container>
          <div className="article-image">
            <Image src={post.image} alt={post.imageAlt} width={1200} height={640} className="h-full w-full object-cover" priority />
          </div>
        </Container>
        <Section>
          <Container className="article-content">
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
            <Link className="button button-secondary mt-8" href={base}>
              {locale === "el" ? "Πίσω στο Blog" : "Back to Blog"}
            </Link>
          </Container>
        </Section>
      </article>
    </>
  );
}
