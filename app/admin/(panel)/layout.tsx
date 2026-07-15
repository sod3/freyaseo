import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/src/lib/admin/actions";
import { can, createCsrfToken, requireAdminUser } from "@/src/lib/admin/auth";
import { adminModules, type AdminModule, type AdminModuleSlug } from "@/src/lib/admin/modules";
import { AdminNavPrefetch } from "./AdminNavPrefetch";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminUser("dashboard.view");
  const csrfToken = await createCsrfToken();
  const visibleModules = adminModules.filter((item) => can(user, item.permission));
  const visibleModuleBySlug = new Map(visibleModules.map((item) => [item.slug, item]));
  const modulesFor = (slugs: AdminModuleSlug[]) => slugs.map((slug) => visibleModuleBySlug.get(slug)).filter((item): item is AdminModule => Boolean(item));
  const primaryModules = modulesFor(["dashboard", "pages", "media", "blog", "navigation", "footer", "seo", "forms"]);
  const contentModules = modulesFor(["services", "tools", "certificates", "faqs", "testimonials", "taxonomy"]);
  const settingsModules = modulesFor(["redirects", "google-integrations", "users", "settings", "audit-logs", "backups"]);
  const renderModule = (item: (typeof visibleModules)[number]) => {
    const Icon = item.icon;
    return (
      <Link href={`/admin/${item.slug}`} key={item.slug}>
        <Icon size={17} aria-hidden />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <AdminNavPrefetch />
        <div className="admin-brand">
          <strong>Freya SEO</strong>
          <span>Custom CMS</span>
        </div>
        <nav className="admin-nav" aria-label="Admin navigation">
          <div className="admin-nav-section">
            <p>Website</p>
            <div className="admin-nav-links">{primaryModules.map(renderModule)}</div>
          </div>
          {contentModules.length ? (
            <details className="admin-nav-more">
              <summary>More content</summary>
              <div className="admin-nav-links">{contentModules.map(renderModule)}</div>
            </details>
          ) : null}
          {settingsModules.length ? (
            <details className="admin-nav-more">
              <summary>Settings</summary>
              <div className="admin-nav-links">{settingsModules.map(renderModule)}</div>
            </details>
          ) : null}
        </nav>
        <form action={logoutAction}>
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <button className="admin-button admin-button-secondary" type="submit">
            <LogOut size={17} aria-hidden />
            Sign out
          </button>
        </form>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <strong>{user.name}</strong>
            <div className="admin-muted">{user.roles.join(", ").replace(/_/g, " ")}</div>
          </div>
          {user.mustChangePassword ? <div className="admin-alert">Please change the initial password in Settings.</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}
