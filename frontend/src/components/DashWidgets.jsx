// Reusable dashboard widgets styled to match the sidebar admin-panel look
// (black & white). Kept dumb/presentational — data comes from the dashboards.

// A stat card: rounded icon square + big value + label (+ optional hint).
export function StatTile({ icon, label, value, hint }) {
  return (
    <div className="stat-tile">
      {icon && <div className="stat-tile__icon">{icon}</div>}
      <div className="stat-tile__body">
        <div className="stat-tile__value">{value}</div>
        <div className="stat-tile__label">{label}</div>
        {hint && <div className="stat-tile__hint">{hint}</div>}
      </div>
    </div>
  );
}

// A titled card wrapper.
export function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel__head">
          {title && <h2 className="panel__title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// Horizontal bars (like the "Top Sales Country" breakdown) — real counts.
// items: [{ label, value }]. Bars are scaled to the largest value.
export function BarList({ items, empty = "No data yet." }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="dash-muted">{empty}</p>;
  return (
    <ul className="barlist">
      {items.map((i) => (
        <li className="barlist__row" key={i.label}>
          <div className="barlist__top">
            <span className="barlist__label">{i.label}</span>
            <span className="barlist__value">{i.value}</span>
          </div>
          <div className="barlist__track">
            <div className="barlist__fill" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
