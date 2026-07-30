import { Link } from "react-router-dom";

const Phone = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2Z" />
  </svg>
);
const Mail = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 6 10 7 10-7" />
  </svg>
);

export default function SiteFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer__inner">
        <div className="lp-footer__brand">
          <span className="lp-footer__logo">
            <img src="/logo-on-dark.png" alt="Akazi" className="brand-logo brand-logo--on-dark" />
          </span>
          <p className="lp-footer__tagline">Work, wherever you are.</p>
        </div>

        <div className="lp-footer__col">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/jobs">Jobs</Link></li>
            <li><Link to="/employers">Employers</Link></li>
          </ul>
        </div>

        <div className="lp-footer__col">
          <h4>Resources</h4>
          <ul>
            <li><Link to="/register">Create account</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><a href="/#how">How it works</a></li>
          </ul>
        </div>

        <div className="lp-footer__col">
          <h4>Contact Us</h4>
          <a className="lp-footer__contact" href="tel:+250783766225"><Phone width={16} height={16} /> 0783766225</a>
          <a className="lp-footer__contact" href="mailto:m.hirwa1@alustudent.com"><Mail width={16} height={16} /> m.hirwa1@alustudent.com</a>
        </div>
      </div>

      <div className="lp-footer__bar">
        © 2026 - <span>Akazi</span> All Rights Reserved
      </div>
    </footer>
  );
}
