import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { api } from "../api/client";

// Public, shareable seeker profile (read-only). Anyone with the link can view it.
export default function TalentProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.talentProfile(id)
      .then((d) => !cancelled && setProfile(d.profile))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  const initial = (profile?.fullName || "?").trim().charAt(0).toUpperCase();
  const skills = profile?.skills || [];
  const experiences = Array.isArray(profile?.experiences) ? profile.experiences : [];
  const projects = Array.isArray(profile?.projects) ? profile.projects : [];

  return (
    <div className="page page--wide">
      <SiteHeader active="" />
      <main className="jobd-page">
        {loading ? (
          <p className="dash-muted">Loading profile…</p>
        ) : error ? (
          <div className="jobs-empty">{error} <div style={{ marginTop: 16 }}><Link to="/" className="lp-btn lp-btn--dark">Go home</Link></div></div>
        ) : (
          <div className="tp">
            <section className="tp-card tp-header">
              <div className="tp-avatar">
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span>{initial}</span>}
              </div>
              <div className="tp-header__info">
                <h2 className="tp-name">{profile.fullName}</h2>
                {profile.headline && <p className="tp-headline">{profile.headline}</p>}
                <div className="tp-meta">
                  {profile.location && <span>{profile.location}</span>}
                </div>
                <div className="tp-pills">
                  {profile.availableForFreelance && <span className="tp-pill tp-pill--green">Open to freelance &amp; contract work</span>}
                  <span className="tp-pill tp-pill--blue">Job seeker</span>
                </div>
              </div>
            </section>

            <div className="tp-body">
              <div className="tp-body__main">
                <section className="tp-card">
                  <h3 className="tp-section-title">About</h3>
                  {profile.bio ? <p className="tp-about">{profile.bio}</p> : <p className="dash-muted">No bio yet.</p>}
                </section>
                <section className="tp-card">
                  <h3 className="tp-section-title">Experience</h3>
                  {experiences.length ? (
                    <ul className="tp-list">
                      {experiences.map((e, i) => (
                        <li className="tp-entry" key={i}>
                          <div className="tp-entry__avatar">{(e.organization || e.title || "?").trim().charAt(0).toUpperCase()}</div>
                          <div className="tp-entry__body">
                            <p className="tp-entry__title">{e.title}</p>
                            {(e.organization || e.period) && <p className="tp-entry__meta">{[e.organization, e.period].filter(Boolean).join(" · ")}</p>}
                            {e.description && <p className="tp-entry__desc">{e.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="dash-muted">No experience listed.</p>}
                </section>
                <section className="tp-card">
                  <h3 className="tp-section-title">Project portfolio</h3>
                  {projects.length ? (
                    <ul className="tp-list">
                      {projects.map((p, i) => (
                        <li className="tp-entry" key={i}>
                          <div className="tp-entry__avatar">{(p.name || "?").trim().charAt(0).toUpperCase()}</div>
                          <div className="tp-entry__body">
                            <p className="tp-entry__title">{p.name}</p>
                            {p.link && <p className="tp-entry__meta"><a href={p.link} target="_blank" rel="noreferrer">{p.link}</a></p>}
                            {p.description && <p className="tp-entry__desc">{p.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="dash-muted">No projects listed.</p>}
                </section>
              </div>
              <aside className="tp-body__side">
                <section className="tp-card">
                  <h3 className="tp-section-title">Skills</h3>
                  {skills.length ? (
                    <ul className="tp-skills">{skills.map((s) => <li className="tp-skill" key={s}>{s}</li>)}</ul>
                  ) : <p className="dash-muted">No skills listed.</p>}
                </section>
              </aside>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
