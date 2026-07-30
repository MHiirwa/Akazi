import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Panel } from "../../components/DashWidgets";
import { useDebounce } from "../../hooks/useDebounce";

// Employer talent pool: browse job-seeker profiles, filter by keyword / skill /
// freelance availability, and expand a card to see the full profile.
export default function EmployerTalent() {
  const { token } = useAuth();
  const [q, setQ] = useState("");
  const [freelanceOnly, setFreelanceOnly] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  const debouncedQ = useDebounce(q);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.talent
      .search({ q: debouncedQ, freelance: freelanceOnly ? "true" : "", limit: 24 }, token)
      .then((data) => {
        if (cancelled) return;
        setCandidates(data.candidates || []);
        setMeta(data.meta || { total: 0 });
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [debouncedQ, freelanceOnly, token]);

  return (
    <Panel title="Find talent">
      <div className="talent-filters">
        <input
          className="talent-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, headline, or skill…"
          aria-label="Search candidates"
        />
        <label className="tp-check">
          <input type="checkbox" checked={freelanceOnly} onChange={(e) => setFreelanceOnly(e.target.checked)} />
          <span>Open to freelance</span>
        </label>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      {loading ? (
        <p className="dash-muted">Searching candidates…</p>
      ) : candidates.length === 0 ? (
        <p className="dash-muted">No candidates match your search.</p>
      ) : (
        <>
          <p className="dash-muted talent-count">{meta.total} candidate{meta.total === 1 ? "" : "s"}</p>
          <ul className="talent-list">
            {candidates.map((c) => {
              const initial = (c.fullName || "?").trim().charAt(0).toUpperCase();
              const experiences = Array.isArray(c.experiences) ? c.experiences : [];
              const projects = Array.isArray(c.projects) ? c.projects : [];
              const isOpen = openId === c.id;
              return (
                <li key={c.id} className="talent-card">
                  <div className="talent-card__top">
                    <div className="talent-card__avatar">
                      {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : <span>{initial}</span>}
                    </div>
                    <div className="talent-card__id">
                      <p className="talent-card__name">{c.fullName}</p>
                      {c.headline && <p className="talent-card__headline">{c.headline}</p>}
                      <p className="talent-card__meta">
                        {c.location || "Location not set"}
                        {c.availableForFreelance && <span className="tp-pill tp-pill--green talent-card__pill">Open to freelance</span>}
                      </p>
                    </div>
                    <button type="button" className="link-btn" onClick={() => setOpenId(isOpen ? null : c.id)}>
                      {isOpen ? "Hide profile" : "View profile"}
                    </button>
                  </div>

                  {c.skills?.length > 0 && (
                    <div className="talent-card__skills">
                      {c.skills.map((s) => <span key={s} className="skill-chip skill-chip--static">{s}</span>)}
                    </div>
                  )}

                  {isOpen && (
                    <div className="talent-card__detail">
                      {c.bio && (
                        <div className="talent-block">
                          <span className="talent-block__label">About</span>
                          <p>{c.bio}</p>
                        </div>
                      )}
                      {experiences.length > 0 && (
                        <div className="talent-block">
                          <span className="talent-block__label">Experience</span>
                          <ul className="talent-sublist">
                            {experiences.map((e, i) => (
                              <li key={i}>
                                <strong>{e.title}</strong>
                                {(e.organization || e.period) && <span className="dash-muted"> — {[e.organization, e.period].filter(Boolean).join(" · ")}</span>}
                                {e.description && <p className="talent-sublist__desc">{e.description}</p>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {projects.length > 0 && (
                        <div className="talent-block">
                          <span className="talent-block__label">Projects</span>
                          <ul className="talent-sublist">
                            {projects.map((p, i) => (
                              <li key={i}>
                                <strong>{p.name}</strong>
                                {p.link && <> — <a href={p.link} target="_blank" rel="noreferrer">link</a></>}
                                {p.description && <p className="talent-sublist__desc">{p.description}</p>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {!c.bio && experiences.length === 0 && projects.length === 0 && (
                        <p className="dash-muted">This candidate hasn't added more profile details yet.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
