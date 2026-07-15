# Database Backup Guide

## What To Back Up

Back up the full MongoDB database. Application-level exports are useful for content review, but they do not replace database backups.

Critical collections include:

- Users, roles, permissions and sessions.
- Pages, sections, translations and revisions.
- Blog posts, services, tools, certificates, FAQs and media metadata.
- SEO metadata, redirects, forms, submissions, settings and audit logs.

## MongoDB Backup

Use your database provider's scheduled backups where available. For manual backups:

```bash
mongodump --uri "$MONGODB_URI" --out ./freyaseo-backup
```

Restore to a safe environment first:

```bash
mongorestore --uri "$MONGODB_URI" ./freyaseo-backup
```

## Media Backups

Database backups do not include S3 object bytes. Back up the object bucket separately.

## Restore Safety

Validate imports and restores in staging before production. Never restore over production without a fresh backup.
