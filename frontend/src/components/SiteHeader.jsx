import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UserMenu from "./UserMenu";

// Top nav for interior pages (Jobs, Employers). Tabs highlight the active
// page. Pass `overlay` to render it transparently ON TOP of a dark hero image
// (used on the Employers page) instead of the default solid white bar.
// `minimal` hides the Home/Jobs/Employers nav (used on the dashboard, where we
// only want the logo + account menu).
export default function SiteHeader({ active, overlay = false, minimal = false }) {
  const { user } = useAuth();

  return (
    <header className={`site-header ${overlay ? "site-header--overlay" : ""} ${minimal ? "site-header--minimal" : ""}`}>
      <div className="site-header__inner">
        <Link to="/" className="site-header__brand" aria-label="Akazi home">
          <img src="/logo-on-dark.png" alt="Akazi" className="brand-logo brand-logo--on-dark" />
        </Link>
        {!minimal && (
          <nav className="site-header__nav" aria-label="Primary">
            <Link to="/" className={active === "home" ? "is-active" : ""}>Home</Link>
            <Link to="/jobs" className={active === "jobs" ? "is-active" : ""} aria-current={active === "jobs" ? "page" : undefined}>Jobs</Link>
            <Link to="/employers" className={active === "employers" ? "is-active" : ""} aria-current={active === "employers" ? "page" : undefined}>Employers</Link>
          </nav>
        )}

        {user ? (
          <UserMenu overlay={overlay} />
        ) : (
          <Link to="/login" className="site-header__login">Login</Link>
        )}
      </div>
    </header>
  );
}
