import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const STEPS = [
  { n: "01", title: "Create an employer account", body: "Sign up and tell us about your company in a couple of minutes." },
  { n: "02", title: "Post your first role", body: "Publish a job once your account is verified — no paperwork." },
  { n: "03", title: "Review & respond", body: "See applicants, shortlist, and notify candidates by SMS or email." },
];

const POINTS = [
  "Reach thousands of local job seekers and freelancers",
  "Verified-employer badge builds candidate trust",
  "Track every applicant from one dashboard",
  "Notify candidates by SMS or email on decisions",
];

export default function Employers() {
  return (
    <div className="page">
      <SiteHeader active="employers" overlay />

      <main className="emp-page">
        {/* One background photo covers the toolbar, the hero, and the
            "why choose" section as a single immersive dark area. */}
        <div className="emp-cover" role="img" aria-label="Two professionals shaking hands after a successful hire">
          <div className="emp-cover__overlay" />

          <section className="emp-hero">
            <div className="emp-hero__text">
              <span className="lp-eyebrow">FOR EMPLOYERS</span>
              <h1 className="emp-hero__title">Hire the right people, locally.</h1>
              <p className="emp-hero__sub">
                Post roles, reach verified local candidates, and manage every application
                from one place — built for how Africa hires.
              </p>
              <div className="emp-hero__cta">
                <Link to="/register" className="lp-btn lp-btn--light">Post a job</Link>
                <Link to="/login" className="lp-btn lp-btn--ghost">Log in</Link>
              </div>
            </div>
          </section>

          <section className="emp-section emp-section--on-cover">
            <h2 className="lp-section__title">Why employers choose Akazi</h2>
            <ul className="emp-points">
              {POINTS.map((p) => (
                <li key={p}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m4 12 5 5L20 6" />
                  </svg>
                  {p}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="emp-section emp-section--alt">
          <h2 className="lp-section__title">How posting works</h2>
          <div className="emp-steps">
            {STEPS.map((s) => (
              <div className="emp-step" key={s.n}>
                <span className="emp-step__n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
          <div className="emp-cta-band">
            <div>
              <h3>Ready to hire?</h3>
              <p>Create an employer account and post your first role today.</p>
            </div>
            <Link to="/register" className="lp-btn lp-btn--dark">Get started</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
