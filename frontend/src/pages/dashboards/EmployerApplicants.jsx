import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Panel } from "../../components/DashWidgets";
import { APPLICATION_STATUSES, statusTone } from "../../constants/applicationStatus";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Dedicated Applicants section: every person who applied to any of the
// employer's listings, with their full background, plus confirm/reject actions.
export default function EmployerApplicants() {
  const { token } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [noteDrafts, setNoteDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [interviewFor, setInterviewFor] = useState(null); // application id being scheduled

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.applications.forEmployer(token);
      setApps(res.applications);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(id, changes) {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...changes } : a)));
  }

  async function setStatus(a, status, reason) {
    setBusyId(a.id);
    try {
      await api.applications.setStatus(a.id, status, token, reason);
      patch(a.id, { status });
      if (status === "REJECTED") { setRejectingId(null); setRejectReason(""); }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }
  async function toggleShortlist(a) {
    try {
      const res = await api.applications.review(a.id, { shortlisted: !a.shortlisted }, token);
      patch(a.id, { shortlisted: res.application.shortlisted });
    } catch (err) {
      setError(err.message);
    }
  }
  async function saveNote(a) {
    try {
      const note = noteDrafts[a.id] ?? a.employerNote ?? "";
      const res = await api.applications.review(a.id, { note }, token);
      patch(a.id, { employerNote: res.application.employerNote });
      setNoteDrafts((d) => ({ ...d, [a.id]: undefined }));
    } catch (err) {
      setError(err.message);
    }
  }
  async function saveInterview(a, body) {
    try {
      const res = await api.applications.scheduleInterview(a.id, body, token);
      const iv = res.application;
      patch(a.id, { interviewAt: iv.interviewAt, interviewLocation: iv.interviewLocation, interviewNote: iv.interviewNote });
      setInterviewFor(null);
    } catch (err) {
      setError(err.message);
    }
  }

  const counts = {
    ALL: apps.length,
    SHORTLISTED: apps.filter((a) => a.shortlisted).length,
    ...Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, apps.filter((a) => a.status === s).length])),
  };

  const term = search.trim().toLowerCase();
  let shown = filter === "ALL" ? apps
    : filter === "SHORTLISTED" ? apps.filter((a) => a.shortlisted)
    : apps.filter((a) => a.status === filter);
  if (term) {
    shown = shown.filter((a) => {
      const p = a.applicant;
      return `${p.fullName} ${p.email} ${(p.skills || []).join(" ")} ${a.job?.title || ""}`.toLowerCase().includes(term);
    });
  }
  shown = [...shown].sort((x, y) => Number(y.shortlisted) - Number(x.shortlisted));

  return (
    <Panel title="Applicants">
      {error && <div className="form-error" role="alert">{error}</div>}

      <div className="applicant-toolbar">
        <div className="applicant-filter" role="tablist" aria-label="Filter applicants">
          {["ALL", "SHORTLISTED", ...APPLICATION_STATUSES].map((s) => {
            if (s !== "ALL" && !counts[s]) return null;
            return (
              <button key={s} type="button" className={`applicant-chip ${filter === s ? "is-active" : ""}`} aria-pressed={filter === s} onClick={() => setFilter(s)}>
                {s === "ALL" ? "All" : s === "SHORTLISTED" ? "★ Shortlisted" : s} ({counts[s]})
              </button>
            );
          })}
        </div>
        <input className="applicant-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, skill, job…" aria-label="Search applicants" />
      </div>

      {loading ? (
        <p className="dash-muted">Loading applicants…</p>
      ) : shown.length === 0 ? (
        <p className="dash-muted">{apps.length === 0 ? "No one has applied to your listings yet." : "No applicants match."}</p>
      ) : (
        <ul className="appl-list">
          {shown.map((a) => {
            const p = a.applicant;
            const initial = (p.fullName || "?").trim().charAt(0).toUpperCase();
            const experiences = Array.isArray(p.experiences) ? p.experiences : [];
            const projects = Array.isArray(p.projects) ? p.projects : [];
            const busy = busyId === a.id;
            const isOpen = expandedId === a.id;
            return (
              <li key={a.id} className={`appl-card ${isOpen ? "is-open" : ""}`}>
                <button
                  type="button"
                  className="appl-card__head"
                  aria-expanded={isOpen}
                  onClick={() => setExpandedId(isOpen ? null : a.id)}
                >
                  <div className="appl-card__avatar">
                    {p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : <span>{initial}</span>}
                  </div>
                  <div className="appl-card__id">
                    <div className="appl-card__namerow">
                      {a.shortlisted && <span className="appl-star-inline" title="Shortlisted">★</span>}
                      <span className="appl-card__name">{p.fullName}</span>
                      <span className={`pill pill--${statusTone(a.status)}`}>{a.status}</span>
                    </div>
                    <p className="appl-card__applied">
                      Applied to <strong>{a.job?.title || "a listing"}</strong> · {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <span className="appl-card__toggle">{isOpen ? "Hide" : "View details"} <span className={`appl-caret ${isOpen ? "is-open" : ""}`}>▸</span></span>
                </button>

                {isOpen && (
                <div className="appl-card__body">
                {p.headline && <p className="appl-card__headline">{p.headline}</p>}

                <div className="appl-grid">
                  <div><span className="applicant-detail__label">Email</span><a href={`mailto:${p.email}`}>{p.email}</a></div>
                  <div><span className="applicant-detail__label">Phone</span><span>{p.phone || "—"}</span></div>
                  <div><span className="applicant-detail__label">Location</span><span>{p.location || "—"}</span></div>
                  <div>
                    <span className="applicant-detail__label">Resume</span>
                    {p.resumeUrl ? <a href={p.resumeUrl} target="_blank" rel="noreferrer">View resume ↗</a> : <span className="dash-muted">Not provided</span>}
                  </div>
                  <div><span className="applicant-detail__label">Freelance</span><span>{p.availableForFreelance ? "Open to freelance" : "—"}</span></div>
                </div>

                {p.bio && (
                  <div className="applicant-detail__block">
                    <span className="applicant-detail__label">About</span>
                    <p className="applicant-cover">{p.bio}</p>
                  </div>
                )}

                <div className="applicant-detail__block">
                  <span className="applicant-detail__label">Skills</span>
                  {p.skills?.length ? (
                    <div className="applicant-skills">{p.skills.map((s) => <span key={s} className="skill-chip skill-chip--static">{s}</span>)}</div>
                  ) : <span className="dash-muted">None listed</span>}
                </div>

                {experiences.length > 0 && (
                  <div className="applicant-detail__block">
                    <span className="applicant-detail__label">Experience</span>
                    <ul className="talent-sublist">
                      {experiences.map((e, i) => (
                        <li key={i}><strong>{e.title}</strong>{(e.organization || e.period) && <span className="dash-muted"> — {[e.organization, e.period].filter(Boolean).join(" · ")}</span>}{e.description && <p className="talent-sublist__desc">{e.description}</p>}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {projects.length > 0 && (
                  <div className="applicant-detail__block">
                    <span className="applicant-detail__label">Projects</span>
                    <ul className="talent-sublist">
                      {projects.map((pr, i) => (
                        <li key={i}><strong>{pr.name}</strong>{pr.link && <> — <a href={pr.link} target="_blank" rel="noreferrer">link</a></>}{pr.description && <p className="talent-sublist__desc">{pr.description}</p>}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="applicant-detail__block">
                  <span className="applicant-detail__label">Cover letter</span>
                  {a.coverLetter ? <p className="applicant-cover">{a.coverLetter}</p> : <span className="dash-muted">No cover letter</span>}
                </div>

                <div className="applicant-detail__block">
                  <span className="applicant-detail__label">Private note</span>
                  <textarea
                    className="applicant-note"
                    rows={2}
                    value={noteDrafts[a.id] ?? a.employerNote ?? ""}
                    onChange={(e) => setNoteDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                    placeholder="Notes only you can see…"
                  />
                  <div className="applicant-note__actions">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => saveNote(a)} disabled={(noteDrafts[a.id] ?? a.employerNote ?? "") === (a.employerNote ?? "")}>Save note</button>
                  </div>
                </div>

                <div className="applicant-detail__block">
                  <span className="applicant-detail__label">Interview</span>
                  {a.interviewAt && interviewFor !== a.id ? (
                    <div className="interview-set">
                      <div>
                        <strong>{new Date(a.interviewAt).toLocaleString()}</strong>
                        {a.interviewLocation && <span className="dash-muted"> · {a.interviewLocation}</span>}
                        {a.interviewNote && <p className="applicant-cover">{a.interviewNote}</p>}
                      </div>
                      <div className="appl-actions">
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setInterviewFor(a.id)}>Edit</button>
                        <button type="button" className="link-btn link-btn--danger" onClick={() => saveInterview(a, { interviewAt: "" })}>Cancel interview</button>
                      </div>
                    </div>
                  ) : interviewFor === a.id ? (
                    <InterviewForm application={a} onSave={(body) => saveInterview(a, body)} onCancel={() => setInterviewFor(null)} />
                  ) : (
                    <button type="button" className="btn-secondary btn-sm" onClick={() => setInterviewFor(a.id)}>Schedule interview</button>
                  )}
                </div>

                {a.status === "WITHDRAWN" ? (
                  <p className="dash-muted appl-actions__note">This candidate withdrew their application.</p>
                ) : rejectingId === a.id ? (
                  <div className="reject-box">
                    <label className="applicant-detail__label" htmlFor={`reason-${a.id}`}>Reason for rejection (the candidate will see this)</label>
                    <textarea
                      id={`reason-${a.id}`}
                      className="applicant-note"
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. We're looking for more experience with…"
                      autoFocus
                    />
                    <div className="appl-actions">
                      <button type="button" className="btn-primary btn-sm" onClick={() => setStatus(a, "REJECTED", rejectReason.trim())} disabled={busy || !rejectReason.trim()}>
                        {busy ? "Rejecting…" : "Confirm rejection"}
                      </button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => { setRejectingId(null); setRejectReason(""); }} disabled={busy}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="appl-actions">
                    <button type="button" className="btn-primary btn-sm" onClick={() => setStatus(a, "ACCEPTED")} disabled={busy || a.status === "ACCEPTED"}>
                      {a.status === "ACCEPTED" ? "Confirmed ✓" : "Confirm"}
                    </button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => setStatus(a, "REVIEWED")} disabled={busy || a.status === "REVIEWED"}>
                      Mark reviewed
                    </button>
                    <button type="button" className="link-btn link-btn--danger" onClick={() => { setRejectReason(""); setRejectingId(a.id); }} disabled={busy || a.status === "REJECTED"}>
                      {a.status === "REJECTED" ? "Rejected" : "Reject"}
                    </button>
                    <button type="button" className={`link-btn shortlist-toggle ${a.shortlisted ? "is-on" : ""}`} onClick={() => toggleShortlist(a)}>
                      {a.shortlisted ? "★ Shortlisted" : "☆ Shortlist"}
                    </button>
                  </div>
                )}
                </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// Small form for scheduling/updating an interview. `datetime-local` value must be
// "YYYY-MM-DDTHH:mm"; we derive it from any existing ISO interviewAt.
function InterviewForm({ application, onSave, onCancel }) {
  const toLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [when, setWhen] = useState(toLocalInput(application.interviewAt));
  const [location, setLocation] = useState(application.interviewLocation || "");
  const [note, setNote] = useState(application.interviewNote || "");

  return (
    <div className="interview-form">
      <div className="field-grid">
        <div className="field">
          <label htmlFor={`iv-when-${application.id}`}>Date & time</label>
          <input id={`iv-when-${application.id}`} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`iv-loc-${application.id}`}>Location / meeting link</label>
          <input id={`iv-loc-${application.id}`} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office address or video link" />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`iv-note-${application.id}`}>Note for the candidate</label>
        <textarea id={`iv-note-${application.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 30-min technical chat — bring a portfolio." />
      </div>
      <div className="appl-actions">
        <button type="button" className="btn-primary btn-sm" onClick={() => onSave({ interviewAt: when, location, note })} disabled={!when}>Save interview</button>
        <button type="button" className="btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
