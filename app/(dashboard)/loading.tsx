export default function DashboardLoading() {
  return (
    <div className="route-loading" role="status" aria-label="Loading page">
      <span className="route-loading-title" />
      <span className="route-loading-line short" />
      <span className="route-loading-card" />
      <span className="route-loading-card compact" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
