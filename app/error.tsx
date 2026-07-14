"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="page-hero">
      <div className="mx-auto w-full max-w-[760px] px-4 text-center sm:px-6 lg:px-8">
        <p className="badge">Error</p>
        <h1>Something went out of alignment.</h1>
        <p>Please try again or return to the homepage.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button className="button button-primary" type="button" onClick={() => reset()}>
            Try again
          </button>
          <Link className="button button-secondary" href="/">
            Home
          </Link>
        </div>
      </div>
    </section>
  );
}
