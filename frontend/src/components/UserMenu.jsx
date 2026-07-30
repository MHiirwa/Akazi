import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Circular avatar (user's initial, or their Google photo) that opens a small
// dropdown menu. Two actions: a primary link (dashboard by default) and log out.
// `primaryLabel`/`primaryTo` let callers repoint the first item (e.g. "Homepage"
// inside the seeker portal), and `className` adds a variant hook for styling.
export default function UserMenu({ overlay = false, primaryLabel = "Dashboard", primaryTo = "/dashboard", className = "" }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (user.fullName || "?").trim().charAt(0).toUpperCase();

  return (
    <div className={`user-menu ${overlay ? "user-menu--overlay" : ""} ${className}`} ref={ref}>
      <button
        type="button"
        className="user-menu__avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="user-menu__img" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__id">
            <span className="user-menu__name">{user.fullName}</span>
            <span className="user-menu__email">{user.email}</span>
          </div>
          <Link to={primaryTo} role="menuitem" className="user-menu__item" onClick={() => setOpen(false)}>
            {primaryLabel}
          </Link>
          <button
            type="button"
            role="menuitem"
            className="user-menu__item user-menu__item--danger"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
