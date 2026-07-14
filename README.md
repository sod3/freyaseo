# Freya SEO Next Frontend

Production-quality bilingual frontend rebuild for Freya SEO, implemented with Next.js App Router-compatible Vinext, TypeScript, Tailwind CSS, Framer Motion, Recharts, Lucide React and local content files.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

The local development server prints its available URL. In this workspace it is currently running at `http://localhost:3001/`.

## Implemented Routes

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

## Content Editing

- Shared labels and contact strings: `src/content/common/`
- Navigation and service dropdowns: `src/content/navigation.ts`
- Route equivalents and hreflang helpers: `src/content/route-map.ts`
- Service landing and service pages: `src/content/services.ts`
- Home and about pages: `src/content/pages/`
- Blog posts: `src/content/blog/`
- Certificates: `src/content/certificates.ts`

## Assets

Downloaded Freya SEO media lives under `public/images/`:

- Brand: `public/images/brand/`
- Portrait/home media: `public/images/home/`
- Services: `public/images/services/`
- Blog: `public/images/blog/`
- Tool logos: `public/images/tools/`
- Social preview: `public/og.png`

Certificate cards currently use polished local preview cards. Replace them with original certificate images later by adding image paths to `src/content/certificates.ts`.

## Backend-Ready Areas

- Contact form validates locally and includes a TODO for future backend/email integration.
- Blog content is local TypeScript and can later be swapped for WordPress REST API or WPGraphQL.
- Service and page content is structured so CMS-backed data can replace local files without redesigning the UI.
- No API secrets or backend connections are included.

## Validation

- `npm run lint` passes.
- `npm run build` passes.
