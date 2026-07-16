import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Filter } from "lucide-react";
import { changePasswordAction, exportModuleAction, uploadMediaAction } from "@/src/lib/admin/actions";
import { can, createCsrfToken, requireAdminUser } from "@/src/lib/admin/auth";
import { creatableCmsModules, editableCmsModules } from "@/src/lib/admin/module-config";
import { getAdminModule, type AdminModuleSlug } from "@/src/lib/admin/modules";
import { getModuleRecords } from "@/src/lib/admin/queries";
import { AdminRecordEditor } from "@/src/components/admin/AdminRecordEditor";

export const dynamic = "force-dynamic";

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
  "storage-configuration": "media storage is not configured for uploads",
  "storage-permission": "media storage rejected the upload credentials; update the Cloudinary or S3 key so it can create assets",
  upload: "media upload failed",
};

function adminStatusMessage(value: string) {
  return adminErrorMessages[value] || value.replace(/-/g, " ");
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
            <span>English alt text</span>
            <input className="admin-input" name="altEn" />
          </label>
          <label className="admin-field">
            <span>Greek alt text</span>
            <input className="admin-input" name="altEl" />
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
            <option value="en">English</option>
            <option value="el">Greek</option>
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
          <form action={exportModuleAction}>
            <input type="hidden" name="module" value={adminModule.slug} />
            <button className="admin-button admin-button-secondary" type="submit">
              <Download size={17} aria-hidden />
              Export
            </button>
          </form>
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
                  <td>{record.language || ""}</td>
                  <td>{record.href || ""}</td>
                  <td>{record.updatedAt?.toLocaleDateString() || ""}</td>
                  <td>
                    <div className="admin-actions">
                      {editableCmsModules.has(adminModule.slug) ? (
                        <Link className="admin-button admin-button-secondary" href={`/admin/${adminModule.slug}?edit=${record.id}`}>
                          Edit
                        </Link>
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
