import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import UserMenu from "../components/UserMenu";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { jobTypeLabel } from "../constants/jobTypes";

// Minimal inline SVGs — only the small functional marks (arrow, check,
// location, contact). No decorative category/brand icons.
const Icon = {
  Pin: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m4 12 5 5L20 6" />
    </svg>
  ),
  Arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  Phone: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2Z" />
    </svg>
  ),
  Mail: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 6 10 7 10-7" />
    </svg>
  ),
};

const CATEGORIES = [
  { title: "Software Development", blurb: "Engineering & IT roles" },
  { title: "Marketing", blurb: "Growth, social & content" },
  { title: "Sales & Communication", blurb: "Client-facing & outreach" },
  { title: "Administration", blurb: "Operations & support" },
];

// How many of the newest listings to feature on the landing page.
const FEATURED_LIMIT = 4;

export default function Home() {
  const { user } = useAuth();
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.jobs
      .search()
      .then((data) => {
        if (!cancelled) setFeatured(data.jobs.slice(0, FEATURED_LIMIT));
      })
      .catch(() => {
        // Landing page is marketing — if jobs can't load, just hide the strip
        // rather than surfacing an error here.
        if (!cancelled) setFeatured([]);
      })
      .finally(() => {
        if (!cancelled) setFeaturedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="landing">
      {/* ---------- Full-screen hero with overlaid nav ---------- */}
      <section className="lp-hero">
        <div className="lp-hero__overlay" />

        <header className="lp-nav">
          <div className="lp-nav__inner">
            <Link to="/" className="lp-brand" aria-label="Akazi home">
              <img src="/logo-on-dark.png" alt="Akazi" className="brand-logo brand-logo--on-dark" />
            </Link>
            <nav className="lp-nav__links" aria-label="Primary">
              <Link to="/">Home</Link>
              <Link to="/jobs">Jobs</Link>
              <Link to="/employers">Employers</Link>
            </nav>
            {user ? (
              <UserMenu overlay />
            ) : (
              <Link to="/login" className="lp-nav__login">Login</Link>
            )}
          </div>
        </header>

        <div className="lp-hero__content">
          <h1 className="lp-hero__title">Opportunity, built for how Africa works.</h1>
          <p className="lp-hero__sub">
            Find work, hire locally, and get matched by SMS or email — even on a slow connection.
          </p>
          <div className="lp-hero__cta">
            <Link to="/jobs" className="lp-btn lp-btn--light">Browse jobs</Link>
            <Link to="/register" className="lp-btn lp-btn--ghost">Create account</Link>
          </div>
        </div>
      </section>

      {/* ---------- Categories ---------- */}
      <section className="lp-section" id="categories">
        <div className="lp-section__head">
          <div>
            <span className="lp-eyebrow">EXPLORE OPPORTUNITIES</span>
            <h2 className="lp-section__title">Start from what you need today</h2>
          </div>
          <Link to="/jobs" className="lp-link">Browse all jobs <Icon.Arrow width={16} height={16} /></Link>
        </div>

        <div className="lp-cards">
          {CATEGORIES.map((c) => (
            <div className="lp-card" key={c.title}>
              <h3 className="lp-card__title">{c.title}</h3>
              <p className="lp-card__blurb">{c.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Feature / how it works ---------- */}
      <section className="lp-feature" id="how">
        <div className="lp-feature__inner">
          <div className="lp-feature__text">
            <h2 className="lp-section__title">One platform from job search to your next role.</h2>
            <p className="lp-feature__lead">
              Akazi connects job seekers, freelancers, and employers so you can find work,
              apply, and track every application from a single dashboard.
            </p>
            <ul className="lp-checklist">
              <li><Icon.Check width={18} height={18} /> Search and filter jobs by location & industry</li>
              <li><Icon.Check width={18} height={18} /> Apply once and track your application status</li>
              <li><Icon.Check width={18} height={18} /> Get notified by SMS or email on updates</li>
            </ul>
            <Link to="/register" className="lp-btn lp-btn--dark">Get started <Icon.Arrow width={16} height={16} /></Link>
          </div>

          <div className="lp-feature__cards" id="employers">
            <div className="lp-mini-card">
              <span className="lp-badge">For employers</span>
              <h4>Post a job in minutes</h4>
              <p>Verified employers reach thousands of local candidates.</p>
            </div>
            <div className="lp-mini-card">
              <span className="lp-badge">For seekers</span>
              <h4>Apply with one profile</h4>
              <p>Build your profile once, apply everywhere.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Featured jobs (newest live listings) ---------- */}
      {(featuredLoading || featured.length > 0) && (
        <section className="lp-section">
          <div className="lp-section__head">
            <h2 className="lp-section__title lp-section__title--lg">Jobs built around your skills</h2>
            <Link to="/jobs" className="lp-btn lp-btn--dark">View all jobs</Link>
          </div>

          {featuredLoading ? (
            <p className="lp-jobs__loading">Loading the latest openings…</p>
          ) : (
            <div className="lp-jobs">
              {featured.map((j) => (
                <div className="lp-job" key={j.id}>
                  <div>
                    <span className="lp-pill">{jobTypeLabel(j.jobType)}</span>
                    <h3 className="lp-job__title">{j.title}</h3>
                    <p className="lp-job__meta"><Icon.Pin width={15} height={15} /> {j.industry} · {j.location}</p>
                  </div>
                  <Link to={`/jobs/${j.id}`} className="lp-btn lp-btn--dark">View job</Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
