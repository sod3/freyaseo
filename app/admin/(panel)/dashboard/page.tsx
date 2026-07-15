import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import { getDashboardData } from "@/src/lib/admin/queries";
import { quickCreateModules } from "@/src/lib/admin/modules";

export default async function AdminDashboardPage() {
  const dashboard = await getDashboardData();
  const stats = [
    ["Pages", dashboard.counts.pages],
    ["Blog posts", dashboard.counts.blogPosts],
    ["Services", dashboard.counts.services],
    ["Tools", dashboard.counts.tools],
    ["Drafts", dashboard.counts.drafts],
    ["Published", dashboard.counts.published],
    ["Missing translations", dashboard.counts.missingTranslations],
    ["Form submissions", dashboard.counts.submissions],
  ];

  return (
    <>
      <div className="admin-page-title">
        <p className="admin-muted">Dashboard</p>
        <h1>Website control center</h1>
        <p className="admin-muted">A calm overview of content status, SEO health and recent activity.</p>
      </div>

      <section className="admin-grid" aria-label="Dashboard statistics">
        {stats.map(([label, value]) => (
          <div className="admin-stat" key={label}>
            <strong>{value}</strong>
            <span className="admin-muted">{label}</span>
          </div>
        ))}
      </section>

      <section className="admin-panel">
        <h2>Quick create</h2>
        <div className="admin-actions">
          {quickCreateModules.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="admin-button admin-button-secondary" href={`/admin/${item.slug}/new`} key={item.slug}>
                <Plus size={17} aria-hidden />
                <Icon size={17} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="admin-panel">
        <h2>Health warnings</h2>
        {dashboard.warnings.length ? (
          dashboard.warnings.map((warning) => (
            <p className="admin-alert" key={warning}>
              <AlertTriangle size={16} aria-hidden /> {warning}
            </p>
          ))
        ) : (
          <p className="admin-muted">No content health warnings right now.</p>
        )}
      </section>

      <section className="admin-panel">
        <h2>Recent activity</h2>
        {dashboard.recentActivity.length ? (
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Action</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentActivity.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.description}</td>
                    <td>{item.updatedAt?.toLocaleString() || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-muted">No admin activity has been recorded yet.</p>
        )}
      </section>
    </>
  );
}
