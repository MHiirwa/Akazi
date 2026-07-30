// A single dashboard stat tile (big value + caption). Shared by every role
// dashboard so the markup and styling live in one place. `tone` optionally
// colors the value: "ok" (green), "warn" (amber), or "bad" (red).
export default function StatCard({ label, value, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-card__value ${tone ? `stat-card__value--${tone}` : ""}`}>{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}
