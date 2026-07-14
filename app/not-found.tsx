import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page-hero">
      <div className="mx-auto w-full max-w-[760px] px-4 text-center sm:px-6 lg:px-8">
        <p className="badge">404</p>
        <h1>Page not found</h1>
        <p>The page may have moved, but the path back to Freya SEO is still clear.</p>
        <Link className="button button-primary mx-auto mt-8" href="/">
          Back to home
        </Link>
      </div>
    </section>
  );
}
