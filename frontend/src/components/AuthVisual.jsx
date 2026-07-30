import { Link } from "react-router-dom";

// Left panel for the auth screens: the "African network / connection"
// image (served from /auth-bg.jpg, with a fallback — see public/README.md),
// with the Akazi wordmark and a short line overlaid.
export default function AuthVisual() {
  return (
    <aside className="auth-visual">
      <Link to="/" className="auth-visual__brand" aria-label="Akazi home">
        <img src="/logo-on-dark.png" alt="Akazi" className="brand-logo brand-logo--on-dark" />
      </Link>
      <div>
        <h2 className="auth-visual__headline">Opportunity, built for how Africa works.</h2>
        <p className="auth-visual__sub">
          One network connecting job seekers and employers across the continent.
        </p>
      </div>
    </aside>
  );
}
