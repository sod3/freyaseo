import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Database, Download, Filter, HardDrive, History, RotateCcw, ShieldCheck } from "lucide-react";
import { AdminDeleteButton } from "@/src/components/admin/AdminDeleteButton";
import { BackupConfirmationButton } from "@/src/components/admin/BackupConfirmationButton";
import {
  changePasswordAction,
  restoreRecordAction,
  softDeleteRecordAction,
  uploadMediaAction,
} from "@/src/lib/admin/actions";
import {
  createWebsiteBackupAction,
  restoreWebsiteBackupAction,
  undoAdminChangeAction,
  verifyWebsiteBackupAction,
} from "@/src/lib/admin/backup-actions";
import { can, createCsrfToken, requireAdminUser } from "@/src/lib/admin/auth";
import { creatableCmsModules, editableCmsModules } from "@/src/lib/admin/module-config";
import { getAdminModule, type AdminModuleSlug } from "@/src/lib/admin/modules";
import { getModuleRecords } from "@/src/lib/admin/queries";
import { getBackupDashboardData } from "@/src/lib/admin/website-backups";
import { activeLanguages, getLanguageSettings, languageLabel as cmsLanguageLabel, type CmsLanguage } from "@/src/lib/cms/languages";
import { AdminRecordEditor } from "@/src/components/admin/AdminRecordEditor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const createLabels: Partial<Record<AdminModuleSlug, string>> = {
  pages: "Create Page",
  blog: "Create Post",
  services: "Create Service",
  tools: "Create Tool",
  certificates: "Create Certificate",
  faqs: "Create FAQ",
  testimonials: "Create Testimonial",
  redirects: "Create Redirect",
  forms: "Create Form",
};

const importantPageAreas = [
  { label: "Homepage", path: "/" },
  { label: "SEO Marketing", path: "/seo-marketing/" },
  { label: "AI SEO", path: "/ai-seo-2/" },
  { label: "Automation", path: "/automation/" },
  { label: "Reporting", path: "/report/" },
  { label: "Tool Generation", path: "/tool-generation/" },
  { label: "Certificates", path: "/certificates/" },
  { label: "About Us", path: "/about/" },
  { label: "Contact Us", path: "/contact-2/" },
  { label: "Greek Homepage", path: "/el/seo-agency/" },
  { label: "Greek Contact", path: "/el/lets-contact/" },
];

const adminErrorMessages: Record<string, string> = {
  "duplicate-path": "This page address is already being used. Choose a different slug or URL path.",
  "invalid-path": "Use a valid page address, such as /about/.",
  "reserved-path": "That page address is reserved by the website. Choose a normal public page path.",
  "storage-configuration": "media storage is not configured for uploads",
  "storage-permission": "media storage rejected the upload credentials; update the Cloudinary or S3 key so it can create assets",
  upload: "media upload failed",
  "backup-busy": "another backup or restore is already running",
  "backup-storage": "persistent backup storage is not configured",
  "backup-integrity": "the backup failed its integrity check and was not restored",
  "backup-failed": "the backup operation failed; no unverified restore was applied",
  "restore-confirmation": "restore confirmation was not accepted",
  "undo-confirmation": "undo confirmation was not accepted",
  "undo-conflict": "this item has newer changes; undo those first or restore a full backup",
};

function adminLanguageLabel(language: CmsLanguage) {
  return language.name || cmsLanguageLabel(language);
}

function adminStatusMessage(value: string) {
  return adminErrorMessages[value] || value.replace(/-/g, " ");
}

function formatBytes(value?: number) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

async function AdminBackupsView({
  csrfToken,
  canRestore,
  notice,
  error,
}: {
  csrfToken: string;
  canRestore: boolean;
  notice?: string;
  error?: string;
}) {
  const data = await getBackupDashboardData();
  return (
    <>
      <div className="admin-page-title">
        <p className="admin-muted">Recovery center</p>
        <h1>Website backups &amp; change history</h1>
        <p className="admin-muted">Create restorable checkpoints, inspect every tracked admin update, undo one update, or return the whole managed website to a checkpoint.</p>
      </div>

      {notice ? <div className="admin-alert">Action complete: {adminStatusMessage(notice)}</div> : null}
      {error ? <div className="admin-alert admin-alert-error">Could not complete action: {adminStatusMessage(error)}</div> : null}

      <section className="admin-backup-overview">
        <article className="admin-panel admin-backup-create">
          <div className="admin-backup-heading">
            <span className="admin-icon-tile"><ShieldCheck size={22} aria-hidden /></span>
            <div>
              <h2>Create a complete checkpoint</h2>
              <p className="admin-muted">The database and every managed upload are encrypted, checksummed, and stored outside the application runtime.</p>
            </div>
          </div>
          <form action={createWebsiteBackupAction} className="admin-backup-form">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <label className="admin-field">
              <span>Checkpoint name</span>
              <input className="admin-input" name="label" maxLength={120} placeholder="Before homepage redesign" required />
            </label>
            <label className="admin-field">
              <span>What are you about to change? (optional)</span>
              <textarea className="admin-textarea" name="note" maxLength={600} rows={3} placeholder="Short reason or release note" />
            </label>
            <button className="admin-button admin-button-primary" type="submit" disabled={!data.storage.configured}>
              <ShieldCheck size={17} aria-hidden />
              Create backup now
            </button>
          </form>
        </article>

        <aside className="admin-panel admin-backup-safety">
          <h2>Protection included</h2>
          <ul className="admin-backup-checklist">
            <li><CheckCircle2 size={17} aria-hidden /><span>Point-in-time database read</span></li>
            <li><CheckCircle2 size={17} aria-hidden /><span>AES-256-GCM encryption and SHA-256 integrity checks</span></li>
            <li><CheckCircle2 size={17} aria-hidden /><span>Uploaded media bytes, not only media links</span></li>
            <li><CheckCircle2 size={17} aria-hidden /><span>Automatic safety backup before every restore</span></li>
            <li><CheckCircle2 size={17} aria-hidden /><span>Conflict-safe undo for individual admin edits</span></li>
          </ul>
          <div className={`admin-storage-state ${data.storage.configured ? "is-ready" : "is-error"}`}>
            <HardDrive size={18} aria-hidden />
            <div><strong>{data.storage.configured ? "Backup storage ready" : "Setup required"}</strong><span>{data.storage.message || data.storage.label}</span></div>
          </div>
          <p className="admin-muted admin-small">Application source code, deployment configuration, and environment secrets are release infrastructure—not admin-managed website data—and are intentionally not restored from this screen.</p>
        </aside>
      </section>

      <section className="admin-panel">
        <div className="admin-section-heading">
          <div><p className="admin-muted">Restore points</p><h2>Backup history</h2></div>
          <Database size={22} aria-hidden />
        </div>
        {data.backups.length ? (
          <div className="admin-table admin-table-embedded">
            <table>
              <thead><tr><th>Checkpoint</th><th>State</th><th>Contents</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {data.backups.map((backup) => (
                  <tr key={backup._id}>
                    <td>
                      <strong>{backup.label}</strong>
                      {backup.kind === "pre_restore" ? <div className="admin-muted">Automatic undo point</div> : null}
                      {backup.note ? <div className="admin-muted">{backup.note}</div> : null}
                    </td>
                    <td>
                      <span className={`admin-backup-status is-${backup.status}`}>{backup.status}</span>
                      <div className="admin-muted">Integrity: {backup.integrityStatus}</div>
                      {backup.errorMessage ? <div className="admin-inline-error">{backup.errorMessage}</div> : null}
                    </td>
                    <td>
                      <strong>{backup.documentCount || 0} records</strong>
                      <div className="admin-muted">{backup.collections?.length || 0} collections · {backup.mediaCount || 0} managed files · {formatBytes(backup.mediaByteSize)}</div>
                      {backup.skippedMediaCount ? <div className="admin-muted">{backup.skippedMediaCount} bundled or external references need no object copy</div> : null}
                    </td>
                    <td>
                      {backup.createdAt.toLocaleString()}
                      <div className="admin-muted">{backup.createdByEmail}</div>
                      {backup.lastRestoredAt ? <div className="admin-muted">Restored {backup.lastRestoredAt.toLocaleString()}</div> : null}
                    </td>
                    <td>
                      <div className="admin-actions admin-actions-compact">
                        {backup.status === "complete" ? (
                          <>
                            <a className="admin-button admin-button-secondary" href={`/admin/api/backups/${backup._id}/download`}>
                              <Download size={16} aria-hidden /> Database archive
                            </a>
                            <form action={verifyWebsiteBackupAction}>
                              <input type="hidden" name="csrfToken" value={csrfToken} />
                              <input type="hidden" name="backupId" value={backup._id} />
                              <button className="admin-button admin-button-secondary" type="submit">Verify</button>
                            </form>
                            {canRestore ? (
                              <form action={restoreWebsiteBackupAction}>
                                <input type="hidden" name="csrfToken" value={csrfToken} />
                                <input type="hidden" name="backupId" value={backup._id} />
                                <BackupConfirmationButton
                                  value={backup._id}
                                  confirmationField="confirmBackupId"
                                  label={backup.kind === "pre_restore" ? "Undo restore" : "Restore"}
                                  message={`Restore “${backup.label}”? A fresh safety backup will be created first. Current admin-managed content and media will be replaced.`}
                                  className="admin-button admin-button-danger-outline"
                                />
                              </form>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="admin-muted">No checkpoints yet. Create one before your next website update.</p>}
      </section>

      <section className="admin-panel">
        <div className="admin-section-heading">
          <div><p className="admin-muted">Admin activity</p><h2>Reversible change history</h2></div>
          <History size={22} aria-hidden />
        </div>
        <p className="admin-muted">Undo is allowed only while the record still matches that update. This prevents an older undo from erasing newer work.</p>
        {data.changes.length ? (
          <div className="admin-table admin-table-embedded">
            <table>
              <thead><tr><th>Update</th><th>Item</th><th>Administrator</th><th>Time</th><th>Action</th></tr></thead>
              <tbody>
                {data.changes.map((change) => (
                  <tr key={change._id}>
                    <td><strong>{change.action.replace(/\./g, " ")}</strong><div className="admin-muted">{change.module}</div></td>
                    <td>{change.entityName}<div className="admin-muted">{change.entityId}</div></td>
                    <td>{change.userEmail}</td>
                    <td>{change.createdAt.toLocaleString()}</td>
                    <td>
                      {change.status === "active" && change.reversible && canRestore ? (
                        <form action={undoAdminChangeAction}>
                          <input type="hidden" name="csrfToken" value={csrfToken} />
                          <input type="hidden" name="changeId" value={change._id} />
                          <BackupConfirmationButton
                            value={change._id}
                            confirmationField="confirmChangeId"
                            label="Undo update"
                            message={`Undo “${change.action.replace(/\./g, " ")}” for “${change.entityName}”?`}
                          />
                        </form>
                      ) : <span className={`admin-backup-status is-${change.status}`}>{change.status}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="admin-muted">New admin edits will appear here with record-level undo.</p>}
      </section>
    </>
  );
}

export default async function AdminModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams?: Promise<{ search?: string; language?: string; status?: string; page?: string; edit?: string; notice?: string; error?: string }>;
}) {
  const { module: rawModule } = await params;
  const adminModule = getAdminModule(rawModule);
  if (!adminModule) notFound();

  const query = (await searchParams) || {};
  if (query.edit) {
    return <AdminRecordEditor moduleSlug={adminModule.slug} id={query.edit} />;
  }

  const user = await requireAdminUser(adminModule.permission);
  const csrfToken = await createCsrfToken();
  if (adminModule.slug === "backups") {
    return (
      <AdminBackupsView
        csrfToken={csrfToken}
        canRestore={can(user, "backups.restore")}
        notice={query.notice}
        error={query.error}
      />
    );
  }
  const languageSettings = await getLanguageSettings();
  const languages = activeLanguages(languageSettings);
  const data = await getModuleRecords(adminModule.slug, query);
  const canWrite = can(user, "content.write");
  const pageRecordByPath = new Map(data.records.map((record) => [record.href, record]));
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.language && query.language !== "all") params.set("language", query.language);
    if (query.status && query.status !== "all") params.set("status", query.status);
    params.set("page", String(page));
    return `/admin/${adminModule.slug}?${params.toString()}`;
  };

  return (
    <>
      <div className="admin-page-title">
        <p className="admin-muted">Admin module</p>
        <h1>{data.title}</h1>
        <p className="admin-muted">{data.description}</p>
      </div>

      {query.notice ? <div className="admin-alert">Action complete: {adminStatusMessage(query.notice)}</div> : null}
      {query.error ? <div className="admin-alert admin-alert-error">Could not complete action: {adminStatusMessage(query.error)}</div> : null}

      {adminModule.slug === "pages" ? (
        <section className="admin-panel">
          <h2>Website pages</h2>
          <div className="admin-shortcut-grid">
            {importantPageAreas.map((area) => {
              const record = pageRecordByPath.get(area.path);
              return (
                <Link className="admin-shortcut-card" href={record ? `/admin/pages?edit=${record.id}` : `/admin/pages?search=${encodeURIComponent(area.path)}`} key={area.path}>
                  <strong>{area.label}</strong>
                  <span>{area.path}</span>
                </Link>
              );
            })}
            <Link className="admin-shortcut-card" href="/admin/navigation?edit=settings">
              <strong>Header navigation</strong>
              <span>Menus, labels and dropdowns</span>
            </Link>
            <Link className="admin-shortcut-card" href="/admin/footer?edit=settings">
              <strong>Footer</strong>
              <span>Footer copy, links and contact details</span>
            </Link>
          </div>
        </section>
      ) : null}

      {adminModule.slug === "settings" ? (
        <form className="admin-form-panel" action={changePasswordAction}>
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <h2>Change password</h2>
          <p className="admin-muted">Use this after first login and whenever an admin password needs to be rotated.</p>
          <label className="admin-field">
            <span>Current password</span>
            <input className="admin-input" type="password" name="currentPassword" autoComplete="current-password" required />
          </label>
          <label className="admin-field">
            <span>New password</span>
            <input className="admin-input" type="password" name="newPassword" autoComplete="new-password" minLength={12} required />
          </label>
          <label className="admin-field">
            <span>Confirm new password</span>
            <input className="admin-input" type="password" name="confirmPassword" autoComplete="new-password" minLength={12} required />
          </label>
          <button className="admin-button admin-button-primary" type="submit">
            Update password
          </button>
        </form>
      ) : null}

      {adminModule.slug === "media" && can(user, "media.write") ? (
        <form className="admin-form-panel" action={uploadMediaAction}>
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <h2>Upload media</h2>
          <p className="admin-muted">Uploads must use persistent storage. On Vercel, configure S3-compatible storage or Cloudinary before using this.</p>
          <label className="admin-field">
            <span>File</span>
            <input className="admin-input" type="file" name="file" accept="image/*,.pdf,.doc,.docx,.txt" required />
          </label>
          <label className="admin-field">
            <span>Internal title</span>
            <input className="admin-input" name="title" placeholder="Homepage hero image" />
          </label>
          <label className="admin-field">
            <span>Alt text</span>
            <div className="admin-json-list">
              {languages.map((language) => (
                <input
                  className="admin-input"
                  name={`alt_${language.code}`}
                  placeholder={`${adminLanguageLabel(language)} alt text`}
                  key={language.code}
                />
              ))}
            </div>
          </label>
          <label className="admin-checkbox">
            <input type="checkbox" name="decorative" />
            <span>This is decorative and does not need alt text</span>
          </label>
          <button className="admin-button admin-button-primary" type="submit">
            Upload
          </button>
        </form>
      ) : null}

      <form className="admin-panel admin-filters">
        <label className="admin-field">
          <span>Search</span>
          <input className="admin-input" name="search" defaultValue={query.search || ""} placeholder="Search titles, URLs or descriptions" />
        </label>
        <input type="hidden" name="page" value="1" />
        <label className="admin-field">
          <span>Language</span>
          <select className="admin-select" name="language" defaultValue={query.language || "all"}>
            <option value="all">All</option>
            {languages.map((language) => (
              <option value={language.code} key={language.code}>
                {adminLanguageLabel(language)}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Status</span>
          <select className="admin-select" name="status" defaultValue={query.status || "all"}>
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="hidden">Hidden</option>
            <option value="deleted">Deleted</option>
          </select>
        </label>
        <button className="admin-button admin-button-secondary" type="submit">
          <Filter size={17} aria-hidden />
          Filter
        </button>
      </form>

      <div className="admin-actions">
        {creatableCmsModules.has(adminModule.slug) && canWrite ? (
          <Link className="admin-button admin-button-primary" href={`/admin/${adminModule.slug}?edit=new`}>
            {createLabels[adminModule.slug] || `Create ${adminModule.label}`}
          </Link>
        ) : null}
        {can(user, "backups.export") ? (
          <Link className="admin-button admin-button-secondary" href="/admin/backups">
            <ShieldCheck size={17} aria-hidden />
            Backups
          </Link>
        ) : null}
      </div>

      <section className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Language</th>
              <th>Location</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.records.length ? (
              data.records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong>{record.title}</strong>
                    {record.description ? <div className="admin-muted">{record.description}</div> : null}
                    {record.meta ? <div className="admin-muted">{record.meta}</div> : null}
                  </td>
                  <td>{record.status || ""}</td>
                  <td>
                    {record.translations?.length ? (
                      <div className="admin-language-status-list">
                        {record.translations.map((translation) =>
                          translation.id ? (
                            <Link
                              className={`admin-language-status admin-language-status-${translation.status.toLowerCase().replace(/\s+/g, "-")}`}
                              href={`/admin/${adminModule.slug}?edit=${translation.id}`}
                              key={translation.locale}
                            >
                              <strong>{translation.label}</strong>
                              <span>{translation.status}</span>
                            </Link>
                          ) : (
                            <span className="admin-language-status admin-language-status-missing" key={translation.locale}>
                              <strong>{translation.label}</strong>
                              <span>Missing</span>
                            </span>
                          ),
                        )}
                      </div>
                    ) : (
                      record.language || ""
                    )}
                  </td>
                  <td>{record.href || ""}</td>
                  <td>{record.updatedAt?.toLocaleDateString() || ""}</td>
                  <td>
                    <div className="admin-actions">
                      {editableCmsModules.has(adminModule.slug) && !record.deleted ? (
                        <Link className="admin-button admin-button-secondary" href={`/admin/${adminModule.slug}?edit=${record.id}`}>
                          Edit
                        </Link>
                      ) : null}
                      {adminModule.slug === "blog" && record.deleted && canWrite ? (
                        <form action={restoreRecordAction}>
                          <input type="hidden" name="csrfToken" value={csrfToken} />
                          <input type="hidden" name="module" value="blog" />
                          <input type="hidden" name="id" value={record.id} />
                          <button className="admin-button admin-button-secondary" type="submit">
                            <RotateCcw size={17} aria-hidden />
                            Restore
                          </button>
                        </form>
                      ) : null}
                      {adminModule.slug === "blog" && !record.deleted && canWrite ? (
                        <form action={softDeleteRecordAction}>
                          <input type="hidden" name="csrfToken" value={csrfToken} />
                          <input type="hidden" name="module" value="blog" />
                          <input type="hidden" name="id" value={record.id} />
                          <AdminDeleteButton recordTitle={record.title} />
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <p className="admin-muted">No records match this view.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {data.pageInfo.total > data.pageInfo.pageSize ? (
        <nav className="admin-pagination" aria-label={`${data.title} pages`}>
          <span className="admin-muted">
            Showing {(data.pageInfo.page - 1) * data.pageInfo.pageSize + 1}-{Math.min(data.pageInfo.page * data.pageInfo.pageSize, data.pageInfo.total)} of{" "}
            {data.pageInfo.total}
          </span>
          <div className="admin-actions">
            {data.pageInfo.hasPrevious ? (
              <Link className="admin-button admin-button-secondary" href={pageHref(data.pageInfo.page - 1)}>
                Previous
              </Link>
            ) : null}
            {data.pageInfo.hasNext ? (
              <Link className="admin-button admin-button-secondary" href={pageHref(data.pageInfo.page + 1)}>
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}

export function generateStaticParams(): Array<{ module: AdminModuleSlug }> {
  return [];
}
