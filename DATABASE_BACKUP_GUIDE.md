# Website Backup, Restore, and Undo Guide

The private CMS recovery center is available at `/admin/backups` to a super administrator. It replaces the former Export control, which only wrote an audit message and did not create a file.

## What a checkpoint contains

Each successful checkpoint contains:

- A point-in-time, Extended JSON snapshot of the MongoDB collections that make up the managed website.
- MongoDB value types such as `ObjectId`, `Date`, binary data, and 64-bit numbers without converting them to lossy plain JSON values.
- Collection index definitions for recovery of a missing collection.
- The original bytes for every CMS-managed S3, Cloudinary, or local upload referenced by `mediaAssets`.
- A manifest with format version, collection counts, media metadata, byte sizes, and SHA-256 checksums.
- AES-256-GCM encryption for the database archive and every copied media object.

The encrypted objects are kept under `CMS_BACKUP_PREFIX/<backup-id>/` in a private S3-compatible bucket, or in `CMS_BACKUP_LOCAL_DIR` for a server with a durable local disk.

Bundled files from `public/`, application source code, dependencies, deployment configuration, and environment variables are release infrastructure. They cannot be changed by this CMS and are intentionally not rolled backward by the admin panel. External media URLs and bundled file references remain in the database snapshot, but their bytes are not copied because the CMS does not own them.

## Security data and audit continuity

Active sessions, login attempts, and password-reset tokens are not placed in a checkpoint. Restoring old authentication tokens could revive access that should have expired.

Users are included in the encrypted archive for disaster-recovery reference but are not changed by an admin-panel restore. Audit logs and reversible change history are also preserved rather than rolled backward. This keeps the current administrator signed in and leaves an unbroken record of who restored what.

## Create and verify a checkpoint

1. Open **Admin → Settings → Backups**.
2. Enter a descriptive checkpoint name and, optionally, the change you are about to make.
3. Select **Create backup now** and wait for the completed status.
4. Confirm that Integrity is `verified`. The creation flow writes the objects, reads them back, decrypts them, and checks every database and managed-media checksum before marking the backup verified.
5. Use **Verify** later to repeat the full read/decrypt/checksum test.

Only one backup or restore can run at a time. The lock expires if a process is interrupted. A restore also temporarily rejects admin edits, inline media uploads, and public form writes so that new data cannot be lost mid-restore.

## Restore the whole managed website

Selecting **Restore** performs these steps:

1. Verify every object in the selected checkpoint before changing live data.
2. Create and verify an automatic `Before restoring …` safety checkpoint of the current website.
3. Restore managed media bytes. Cloudinary versioned URLs are rewritten in the restored documents when Cloudinary returns a new asset version URL.
4. Replace restorable MongoDB collections in a multi-document transaction with majority write concern.
5. Restore any missing indexes and invalidate website caches.
6. Record the operation in the append-only audit trail.

If the restore fails after the safety checkpoint is created, the service automatically restores that safety checkpoint. If both restore and automatic rollback fail, the operation is marked `rollback_failed`; do not make more CMS changes until the safety checkpoint has been recovered.

To undo a successful full restore, select **Undo restore** on its automatic safety checkpoint. Another safety checkpoint is created first, so this action is itself reversible.

## Undo one admin update

New page, post, setting, collection-record, translation, delete/restore, and media-metadata changes are recorded in **Reversible change history**. **Undo update** restores only that document.

Undo compares the current document checksum with the exact post-change document. If somebody edited the record again, the older undo is rejected. Undo the newest change first or use a full checkpoint. A successful undo creates its own inverse history item, allowing the undo to be reversed.

Media-upload undo removes the CMS record from the website state but intentionally does not hard-delete a provider asset. Full restore recovers the stored bytes for all managed media in the selected checkpoint.

## Required environment configuration

Production should use a private S3-compatible bucket that is separate from public media delivery where possible:

```env
CMS_BACKUP_DRIVER="s3"
CMS_BACKUP_BUCKET="private-freya-backups"
CMS_BACKUP_PREFIX="cms-backups"
CMS_BACKUP_ENCRYPTION_KEY="a-stable-secret-with-at-least-32-characters"

S3_ENDPOINT="https://your-s3-compatible-endpoint"
S3_REGION="auto"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
```

If `CMS_BACKUP_BUCKET` is empty, `S3_BUCKET` is used. The S3 credentials require read and create/write access to the backup prefix. They also require read/write access to CMS media keys when S3 is the media provider.

`CMS_BACKUP_ENCRYPTION_KEY` falls back to `AUTH_SECRET`, but a separate, stable secret is strongly recommended. Losing or rotating this key without retaining the old value makes existing encrypted backups unreadable. Never store the key in the backup bucket or commit it to source control.

For a self-hosted server with a durable disk:

```env
CMS_BACKUP_DRIVER="local"
CMS_BACKUP_LOCAL_DIR="/absolute/private/path/freya-backups"
CMS_BACKUP_ENCRYPTION_KEY="a-stable-secret-with-at-least-32-characters"
```

Local backup storage is rejected on Vercel because its runtime disk is not durable.

After deploying this feature, run `npm run db:migrate` once to create the backup, history, lock, and restore-operation indexes.

## Operational recommendations

- Create a named checkpoint before each content release or bulk edit.
- Keep provider-native MongoDB backups or point-in-time recovery enabled as a second recovery layer. The admin workflow is optimized for this CMS; it does not replace an infrastructure-level disaster-recovery plan.
- Enable S3 Versioning. For high-value retention, use a bucket that supports Object Lock and an appropriate retention policy.
- Keep the bucket private, block public access, restrict credentials to the required prefixes, and monitor access logs.
- Verify checkpoints on a schedule and periodically test restoration in staging.
- Keep at least one copy in a different failure domain/account.
- Review storage growth. The implementation keeps checkpoints until an operator applies the bucket lifecycle/retention policy; it never silently deletes a recovery point.

## Research basis

- MongoDB recommends provider snapshots/cloud backups for resilient large deployments and describes database tools as appropriate for smaller deployments: <https://www.mongodb.com/docs/manual/core/backups/>
- Snapshot reads provide a consistent view across related queries: <https://www.mongodb.com/docs/manual/tutorial/long-running-queries/>
- MongoDB transactions provide atomic multi-document restore writes; transaction runtime limits still apply: <https://www.mongodb.com/docs/drivers/node/current/crud/transactions/> and <https://www.mongodb.com/docs/manual/core/transactions-production-consideration/>
- Amazon S3 documents checksum verification, Versioning, encryption, and Object Lock: <https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html>, <https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html>, and <https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html>
- Cloudinary documents asset backup/version behavior and the URL-version implications of overwriting an asset: <https://cloudinary.com/documentation/backups_and_version_management> and <https://cloudinary.com/documentation/image_upload_api_reference>
