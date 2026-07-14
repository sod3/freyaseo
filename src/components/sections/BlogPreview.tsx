import Image from "next/image";
import Link from "next/link";
import type { BlogPost, Locale } from "@/src/types";
import { getCommon } from "@/src/content/common";

export function BlogPreview({ posts, locale }: { posts: BlogPost[]; locale: Locale }) {
  const read = getCommon(locale).actions.readArticle;
  const base = locale === "el" ? "/el/seo-blog/" : "/blog/";
  return (
    <div className="blog-preview-grid">
      {posts.slice(0, 3).map((post) => (
        <article className="blog-card" key={post.slug}>
          <Link href={`${base}${post.slug}/`} className="blog-image-wrap">
            <Image src={post.image} alt={post.imageAlt} width={640} height={420} className="h-full w-full object-cover" />
          </Link>
          <div className="blog-card-body">
            <span>{post.category}</span>
            <h3>
              <Link href={`${base}${post.slug}/`}>{post.title}</Link>
            </h3>
            <p>{post.excerpt}</p>
            <Link href={`${base}${post.slug}/`} className="card-link">
              {read}
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
