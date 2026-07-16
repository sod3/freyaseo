# Media Storage Guide

## Storage Rule

Uploads must be stored on persistent infrastructure.

- Use S3-compatible storage or Cloudinary on Vercel.
- Use local storage only on a VPS or server with a persistent disk.

## S3-Compatible Configuration

Set:

```env
CMS_STORAGE_DRIVER=s3
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
```

The storage adapter uploads files under a `cms/` prefix and stores searchable metadata in MongoDB.

## Cloudinary Configuration

Set:

```env
CMS_STORAGE_DRIVER=cloudinary
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
CLOUDINARY_FOLDER=cms
```

Alternatively, set the Cloudinary values separately:

```env
CMS_STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=cms
```

Cloudinary uploads do not use `S3_ENDPOINT`, `S3_BUCKET`, or `S3_PUBLIC_BASE_URL`.

## Validation

The upload action rejects unsupported file types, oversized files and executable extensions.

Allowed examples:

- JPG, PNG, WebP, GIF, SVG
- PDF
- TXT, DOC, DOCX

## Local Persistent Storage

Only use this on a server with a durable disk:

```env
CMS_STORAGE_DRIVER=local
CMS_LOCAL_UPLOAD_DIR=/var/www/freyaseo/uploads
```

Local storage is blocked on Vercel.
