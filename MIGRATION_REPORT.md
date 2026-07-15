# Migration Report

## Source

The migration source is `content/cms/`, generated from the current Freya SEO website and existing content files.

## Imported Content

Current migration source counts:

- Pages: 69
- Blog posts: 8
- Services: 4
- Tools: 24
- Tool categories: 1
- Certificates: 9
- FAQs: 8
- Media assets: 177
- Authors: 1
- Tags: 4
- Blog categories: 4
- Redirects: 2
- Settings files: 6

## Preservation Strategy

Existing page HTML snapshots, routes, body classes, SEO metadata and alternate-language paths are imported so the public design remains identical. Structured records are created for content management and future block rendering.

## Migration Command

```bash
npm run db:migrate
npm run db:seed
```

The seed script is repeatable and uses upserts for stable records. Embedded section data, form definitions and source metadata are refreshed from the migration source.

## Keystatic Removal

Keystatic packages, config, admin route, API route, reader usage, preview secret usage and documentation were removed. The public reader now uses MongoDB with a local migration-source fallback.
