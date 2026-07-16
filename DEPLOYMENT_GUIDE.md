# Deployment Guide

## Required Infrastructure

The custom CMS requires:

- A persistent MongoDB database.
- Persistent object storage for uploads on Vercel or any ephemeral runtime.
- Secure environment variables.

## Environment Variables

Set:

```env
MONGODB_URI=
MONGODB_DB=
AUTH_SECRET=
CMS_PREVIEW_SECRET=
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_PASSWORD=
NEXT_PUBLIC_SITE_URL=
CMS_STORAGE_DRIVER=
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
CLOUDINARY_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=
```

Use `CMS_STORAGE_DRIVER=s3` or `CMS_STORAGE_DRIVER=cloudinary` on Vercel.

## Deploy Steps

1. Provision MongoDB Atlas or another persistent MongoDB provider.
2. Provision persistent object storage, such as S3-compatible storage or Cloudinary.
3. Set environment variables in the hosting platform.
4. Run `npm run db:migrate`.
5. Run `npm run db:seed` once.
6. Deploy the Next.js app.
7. Sign in at `/admin/login`.
8. Change the initial admin password.

## Build Commands

```bash
npm install
npm run build
```

Run `npm run db:migrate` after changing indexes or before first seeding.

## Notes For Vercel

Vercel runtime storage is temporary. Do not use local upload storage for production media on Vercel.
