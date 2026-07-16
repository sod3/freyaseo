# Custom CMS Guide

## Architecture

The CMS runs inside the same Next.js application as the public Freya SEO website.

- Public pages read server-side content through `src/lib/cms/reader.ts`.
- The reader prefers MongoDB and falls back to `content/cms/` only when database access is not configured.
- The admin dashboard lives under `/admin`.
- Authentication uses email/password, bcrypt hashes, HTTP-only cookies, session records and CSRF tokens.
- MongoDB indexes are prepared by `scripts/ensure-mongodb-indexes.mjs`.
- Seed import lives at `scripts/seed-custom-cms.mjs`.
- Uploads use `src/lib/storage/` and require persistent local storage, S3-compatible storage, or Cloudinary.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET`, `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` and `NEXT_PUBLIC_SITE_URL`.
3. Configure persistent upload storage.
4. Run:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Admin Login

Visit `/admin/login` and use the initial admin credentials from the environment. The seeded user must change the initial password in Settings after the first login.

## Content Model

The database supports users, roles, permissions, sessions, pages, translations, sections, revisions, blog posts, services, tools, certificates, FAQs, testimonials, media, navigation/settings, SEO metadata, redirects, forms, submissions, audit logs and system settings.

Page records can render either WordPress HTML snapshots or structured section blocks. Non-page modules use structured JSON editors in the admin so clients can update copy, URLs, ordering, visibility and metadata without touching source files.

## Publishing

Supported statuses include draft, in review, scheduled, published, unpublished, archived, hidden and soft deleted. Public readers only show published content unless draft mode is enabled.

## Validation

Before release:

```bash
npm run lint
npm run typecheck
npm run build
npm run vinext:build
npm test
```
