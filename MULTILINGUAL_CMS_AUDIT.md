# Multilingual CMS Audit

## Architecture

- Next.js: 16.2.6 with the App Router.
- Public rendering: mostly WordPress/Elementor HTML snapshots rendered through `WpClonePageForPath`; blog article pages use React templates.
- CMS source: local JSON/MDOC files in `content/cms` with optional MongoDB runtime storage.
- Database: MongoDB through the native driver in `src/lib/mongo.ts`; Prisma and Drizzle folders are present but not used by the active CMS.
- Admin auth: custom cookie session (`freya_admin_session`), MongoDB sessions, bcrypt passwords, CSRF tokens for server actions, role-based permissions.
- Upload storage: S3-compatible storage, Cloudinary fallback, or local storage for non-production use.
- SEO: page metadata from CMS page records, blog metadata from `pageMetadata`, sitemap from CMS page paths.
- Existing localization: `content/cms/settings/languages.json`, `src/lib/cms/language-utils.ts`, legacy hardcoded `src/content/route-map.ts`, duplicated static English and Greek route files, and runtime DOM repair in `WpCloneBehavior`.

## Current Locale And Routing Issues

- Locale data exists centrally, but public URL generation still depends on hardcoded English/Greek route maps.
- Static route files exist for English pages and separate Greek paths such as `/el/about-us/`, while catch-all CMS routing also handles dynamic paths.
- The public language switcher falls back to `getAlternatePath()`, which only understands existing English/Greek paths.
- WordPress snapshot HTML contains stale Polylang language links that can point to `/` when a translation is marked missing.
- Metadata uses special Greek-only alternate logic instead of translation groups.
- Missing translations are treated as missing pages unless the exact path exists.
- Adding a language in the admin updates language settings, but the public routing layer has no reliable fallback path for new language URLs.

## Content Model

- Page records already contain shared-ish fields plus localized metadata: `path`, `locale`, `status`, `translationKey`, `alternatePath`, `html`, `sections`, `seo`.
- Blog records use `language`/`locale`, `slug`, `translationGroup`, SEO, image fields, and draft status.
- The existing schema can be stabilized without destructive migration by treating `translationKey`/`translationGroup` as the page identity and `locale + translationKey` as the translation uniqueness boundary.

## Admin

- Admin modules cover pages, blog, media, forms, navigation/footer/settings, languages, SEO, redirects, users, audit logs, and backups.
- Page editing includes a visual HTML text/image editor and a raw advanced section editor.
- Language management has been simplified but still needs stronger status labels, one-click translation creation, and route-safe language grouping.
- Write operations are server actions guarded by auth and CSRF, but validation/error messages can be made more client friendly.

## Root Cause Of Language 404s

Changing language can generate a path that is not backed by a page record because the switcher and metadata combine hardcoded route maps, static route files, WordPress snapshot links, and CMS translation keys. When a translation does not exist, the system often navigates to a guessed path instead of resolving an equivalent content group and falling back to the default-language page.

## Fix Direction

- Use language settings plus CMS page translation keys as the source of truth.
- Resolve alternate URLs from content identity first, then fall back to a safe prefixed default-language path.
- Render fallback content for missing translations instead of 404ing.
- Keep existing SEO-safe Greek URLs when a translation exists.
- Preserve all existing public design and WordPress snapshot content.
