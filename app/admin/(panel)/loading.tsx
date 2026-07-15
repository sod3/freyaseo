export default function AdminPanelLoading() {
  const rows = Array.from({ length: 6 }, (_, index) => index);

  return (
    <div className="admin-loading" aria-busy="true" aria-live="polite">
      <div className="admin-page-title">
        <span className="admin-skeleton admin-skeleton-kicker" />
        <span className="admin-skeleton admin-skeleton-heading" />
        <span className="admin-skeleton admin-skeleton-copy" />
      </div>
      <section className="admin-grid">
        {rows.slice(0, 4).map((row) => (
          <div className="admin-stat" key={row}>
            <span className="admin-skeleton admin-skeleton-stat" />
            <span className="admin-skeleton admin-skeleton-copy" />
          </div>
        ))}
      </section>
      <section className="admin-table">
        <table>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <td>
                  <span className="admin-skeleton admin-skeleton-row" />
                </td>
                <td>
                  <span className="admin-skeleton admin-skeleton-short" />
                </td>
                <td>
                  <span className="admin-skeleton admin-skeleton-short" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
