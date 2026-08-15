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

The configured Cloudinary API key must be able to create/upload assets in the selected product environment. If uploads show an error like `Request forbidden due to missing permissions (actions=["create"])`, update the Cloudinary key/secret in Vercel to credentials with asset create permission, then redeploy.

For S3-compatible storage, the configured access key must be allowed to create objects in the target bucket under the `cms/` prefix, for example `s3:PutObject` on `bucket/cms/*`.

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

## Repair legacy local-media records

Older records can contain an absolute path from the computer where an upload was created, for example a Windows `C:\...` path. That path is not portable to a Linux deployment and local serverless storage is not durable. The backup reader now treats such a path as stale: it keeps the upload-root containment check, resolves the filename only inside the current `CMS_LOCAL_UPLOAD_DIR`, and can use the same-site `/uploads/...` delivery route when the bytes are available there. It never follows an arbitrary external URL.

For a serverless production site, migrate recoverable local assets to Cloudinary instead of relying on that fallback:

```bash
# Read-only inventory and local checksum pass.
npm run media:migrate-local

# Upload, download, checksum-verify, then transactionally update MongoDB.
npm run media:migrate-local -- --apply
```

The apply command stops before changing MongoDB if any local source file is missing. Each Cloudinary upload is downloaded again and compared byte-for-byte before the related database record changes. The migration is idempotent: after success, a new dry run reports zero local assets.

## Research basis

- Node's `path` behavior is operating-system-specific; its documented `path.win32` and `path.posix` variants explain why a Windows absolute path cannot be parsed with the host-default POSIX implementation: <https://nodejs.org/api/path.html#windows-vs-posix>
- Vercel documents that runtime filesystem writes are ephemeral and recommends persistent object storage for application data: <https://vercel.com/guides/how-can-i-use-files-in-serverless-functions>
- Cloudinary accepts backend uploads from file data and returns a durable delivery URL/public ID: <https://cloudinary.com/documentation/upload_images>
