# Security Guide

## Authentication

Admin authentication uses:

- Email and password.
- bcrypt password hashing.
- HTTP-only SameSite cookies.
- Database-backed sessions.
- Session revocation.
- Failed-login records and temporary lockout.
- Required password change for the initial seeded admin.

## Authorization

Roles are stored in the database:

- Super Administrator
- Administrator
- Editor
- Viewer

Server actions call permission checks before mutating records. UI controls are also hidden when a user lacks permission, but server checks are the source of truth.

## CSRF

Admin forms use a signed CSRF token stored in an HTTP-only cookie and submitted as a hidden form value.

## Content Safety

- Rich/public form text is sanitized before storage where user-provided.
- Arbitrary scripts are not accepted through ordinary content forms.
- Uploads validate MIME type, size and dangerous extensions.
- Redirects are created only through server-side mutation paths.

## Indexing

Admin routes use no-index metadata, middleware `X-Robots-Tag`, and robots disallow rules.

## Secrets

Never put secrets in `NEXT_PUBLIC_*`. Do not commit `.env`.
