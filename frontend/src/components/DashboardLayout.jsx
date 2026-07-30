import { Link } from "react-router-dom";
import UserMenu from "./UserMenu";

// Shared shell for the admin & employer dashboards, inspired by a sidebar
// admin-panel layout: fixed left sidebar (brand + section nav + profile) and a
// main column with a welcome header and the active section's content. Account
// actions (profile, log out) live in the avatar dropdown in the top bar.
//
// Props:
//   navItems  [{ key, label, icon }]  — sidebar sections
//   active    current section key
//   onNavigate(key)
//   title / subtitle                  — welcome header text
//   actions                           — optional right-aligned header buttons
export default function DashboardLayout({ navItems, active, onNavigate, title, subtitle, actions, hideIcons = false, children }) {
  return (
    <div className="dl">
      <aside className="dl-sidebar">
        <Link to="/" className="dl-brand" aria-label="Akazi home">
          <img src="/logo-light.png" alt="Akazi" className="dl-brand__logo" />
        </Link>

        <nav className="dl-nav" aria-label="Dashboard sections">
          {navItems.map((it) => (
            <button
              key={it.key}
              type="button"
              className={`dl-nav__item ${active === it.key ? "is-active" : ""}`}
              aria-current={active === it.key ? "page" : undefined}
              onClick={() => onNavigate(it.key)}
            >
              {!hideIcons && it.icon && <span className="dl-nav__icon">{it.icon}</span>}
              <span>{it.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="dl-main">
        <header className="dl-topbar">
          {(title || subtitle) && (
            <div>
              {title && <h1 className="dl-welcome">{title}</h1>}
              {subtitle && <p className="dl-subtitle">{subtitle}</p>}
            </div>
          )}
          <div className="dl-topbar__right">
            {actions}
            <UserMenu primaryLabel="Homepage" primaryTo="/" className="user-menu--portal" />
          </div>
        </header>

        <div className="dl-content">{children}</div>
      </div>
    </div>
  );
}

// Minimal stroke icon set (kept here so dashboards import one place).
const S = (p) => ({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", ...p });
export const Icons = {
  grid: (p) => (<svg {...S(p)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>),
  users: (p) => (<svg {...S(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6" /><path d="M17.5 20a5.5 5.5 0 0 0-2.8-4.8" /></svg>),
  briefcase: (p) => (<svg {...S(p)}><rect x="2.5" y="7" width="19" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>),
  shield: (p) => (<svg {...S(p)}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>),
  plus: (p) => (<svg {...S(p)}><path d="M12 5v14M5 12h14" /></svg>),
  file: (p) => (<svg {...S(p)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /></svg>),
  user: (p) => (<svg {...S(p)}><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>),
  logout: (p) => (<svg {...S(p)}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 12H3m0 0 3.5-3.5M3 12l3.5 3.5" /></svg>),
  folder: (p) => (<svg {...S(p)}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>),
  star: (p) => (<svg {...S(p)}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9Z" /></svg>),
  check: (p) => (<svg {...S(p)}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>),
  bell: (p) => (<svg {...S(p)}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>),
};
