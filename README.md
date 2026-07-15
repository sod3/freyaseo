# Freya SEO Next Frontend

Production bilingual Freya SEO website built with Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Recharts and Lucide React.

The public website design is preserved through the existing WordPress-clone HTML snapshots and structured React components. The private CMS is now a custom in-app admin system at `/admin`, backed by MongoDB.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

Database commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Public Routes

English:

- `/`
- `/seo-marketing/`
- `/ai-seo-2/`
- `/automation/`
- `/report/`
- `/tool-generation/`
- `/certificates/`
- `/about/`
- `/blog/`
- `/blog/[slug]/`
- `/contact-2/`

Greek:

- `/el/seo-agency/`
- `/el/seo-marketing-2/`
- `/el/ai-seo-4/`
- `/el/automation-2/`
- `/el/report-2/`
- `/el/tool-generation-2/`
- `/el/certificates-seo/`
- `/el/about-us/`
- `/el/seo-blog/`
- `/el/seo-blog/[slug]/`
- `/el/lets-contact/`

## Custom CMS

The private CMS is available at:

```text
/admin
```

Admin routes are protected, no-indexed, excluded from robots, and backed by secure HTTP-only session cookies. The CMS supports database records for pages, page sections, blog posts, services, tools, certificates, FAQs, media, navigation, footer/settings, SEO metadata, redirects, form submissions, users, roles, sessions, revisions and audit logs.

Required environment variables are listed in `.env.example`. At minimum, production needs:

```env
MONGODB_URI=
MONGODB_DB=
AUTH_SECRET=
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_PASSWORD=
NEXT_PUBLIC_SITE_URL=
```

Uploads must use persistent storage. On Vercel or other ephemeral runtimes, configure the S3-compatible variables in `.env.example`.

## Migration Source

`content/cms/` is the repeatable migration source generated from the current website content. Run:

```bash
npm run db:migrate
npm run db:seed
```

The seed imports existing pages, HTML snapshots, SEO metadata, blog posts, tools, services, media references, certificates, FAQs, redirects, settings and the initial administrator. Public routes read from MongoDB first and only fall back to this migration source when database access is not configured.

## Assets

Downloaded Freya SEO media lives under `public/images/` and `public/wp-clone/`:

- Brand: `public/images/brand/`
- Portrait/home media: `public/images/home/`
- Services: `public/images/services/`
- Blog: `public/images/blog/`
- Tool logos: `public/images/tools/`
- Social preview: `public/og.png`

## Documentation

See:

- `CUSTOM_CMS_GUIDE.md`
- `ADMIN_USER_GUIDE.md`
- `DEPLOYMENT_GUIDE.md`
- `DATABASE_BACKUP_GUIDE.md`
- `MEDIA_STORAGE_GUIDE.md`
- `SECURITY_GUIDE.md`
- `MIGRATION_REPORT.md`

## Validation

Before deployment, run:

```bash
npm run lint
npm run typecheck
npm run build
```
