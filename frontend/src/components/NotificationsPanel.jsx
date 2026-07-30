import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
}

// Reusable notifications list. `onChange(unread)` lets a parent keep a badge in
// sync as items are marked read.
export default function NotificationsPanel({ onChange }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await api.notifications.list(token);
      setItems(data.notifications);
      onChange?.(data.unread);
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markRead(n) {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    onChange?.(items.filter((x) => !x.read && x.id !== n.id).length);
    try { await api.notifications.markRead(n.id, token); } catch { /* ignore */ }
  }
  async function markAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    onChange?.(0);
    try { await api.notifications.markAllRead(token); } catch { /* ignore */ }
  }

  const unread = items.filter((x) => !x.read).length;

  if (loading) return <p className="dash-muted">Loading notifications…</p>;
  if (items.length === 0) return <p className="dash-muted">No notifications yet.</p>;

  return (
    <>
      {unread > 0 && (
        <div className="notif-head">
          <span className="dash-muted">{unread} unread</span>
          <button type="button" className="link-btn" onClick={markAll}>Mark all read</button>
        </div>
      )}
      <ul className="notif-list">
        {items.map((n) => {
          const body = (
            <>
              <span className={`notif-dot ${n.read ? "is-read" : ""}`} aria-hidden="true" />
              <div className="notif-item__body">
                <p className="notif-item__msg">{n.message}</p>
                <span className="notif-item__time">{timeAgo(n.createdAt)}</span>
              </div>
            </>
          );
          return (
            <li key={n.id} className={`notif-item ${n.read ? "is-read" : ""}`}>
              {n.link ? (
                <Link to={n.link} className="notif-item__link" onClick={() => markRead(n)}>{body}</Link>
              ) : (
                <button type="button" className="notif-item__link" onClick={() => markRead(n)}>{body}</button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
