import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Icons } from "../../components/DashboardLayout";
import { StatTile, Panel } from "../../components/DashWidgets";
import { jobTypeLabel } from "../../constants/jobTypes";
import { APPLICATION_STATUSES, statusTone } from "../../constants/applicationStatus";
import DocumentsPortfolio from "./DocumentsPortfolio";
import SeekerSaved from "./SeekerSaved";
import UserMenu from "../../components/UserMenu";
import NotificationsPanel from "../../components/NotificationsPanel";
import { useSectionParam } from "../../hooks/useSectionParam";

// Whole days since a timestamp, for the "Posted Nd ago" line.
function daysAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Friendly line describing the latest change on an application.
const STATUS_UPDATE = {
  REVIEWED: "The employer reviewed your application.",
  ACCEPTED: "🎉 You've been accepted!",
  REJECTED: "Not selected this time.",
};

const NAV = [
  { key: "overview", label: "Overview" },
  { key: "applications", label: "My applications" },
  { key: "saved", label: "Saved jobs" },
  { key: "documents", label: "Documents & portfolio" },
  { key: "recommended", label: "Recommended jobs" },
];

export default function JobSeekerDashboard() {
  const { user, token } = useAuth();
  const [section, setSection] = useSectionParam("overview");
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [confirmingId, setConfirmingId] = useState(null); // row awaiting confirmation
  const [withdrawingId, setWithdrawingId] = useState(null); // row with an in-flight request

  // Recommended jobs — loaded lazily the first time that section is opened.
  const [recJobs, setRecJobs] = useState(null); // null = not loaded yet
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState("");

  // Unread notification count for the toolbar bell.
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    api.notifications.list(token).then((d) => setUnread(d.unread)).catch(() => {});
  }, [token]);

  // Overview "recent applications" table tab.
  const [ovTab, setOvTab] = useState("ALL");

  const skills = user.skills || [];

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.applications.mine(token);
      setApplications(res.applications);
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

  async function confirmWithdraw(id) {
    setError("");
    setNotice("");
    setWithdrawingId(id);
    try {
      await api.applications.withdraw(id, token);
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: "WITHDRAWN" } : a)));
      setNotice("Application withdrawn.");
    } catch (err) {
      setError(err.message);
    } finally {
      setWithdrawingId(null);
      setConfirmingId(null);
    }
  }

  // Jobs the seeker has already applied to — kept out of recommendations.
  const appliedJobIds = useMemo(
    () => new Set(applications.map((a) => a.job?.id).filter(Boolean)),
    [applications]
  );

  // Score a batch of open jobs by how many of the seeker's skills appear in the
  // posting, then keep the strongest matches. Runs the first time the
  // Recommended tab is opened (and again if the seeker has no skills yet).
  async function loadRecommended() {
    setRecLoading(true);
    setRecError("");
    try {
      const data = await api.jobs.search({ limit: 50 });
      const all = data.jobs || data.data || [];
      const lowered = skills.map((s) => s.toLowerCase()).filter(Boolean);
      const scored = all
        .filter((job) => !appliedJobIds.has(job.id))
        .map((job) => {
          const haystack = `${job.title} ${job.description || ""} ${job.industry} ${job.location}`.toLowerCase();
          const matched = lowered.filter((s) => haystack.includes(s));
          return { job, score: matched.length, matched };
        });
      // With skills: only real matches, best first. Without skills: fall back to
      // the newest openings so the tab is never empty.
      const ranked = lowered.length
        ? scored.filter((r) => r.score > 0).sort((a, b) => b.score - a.score)
        : scored.slice(0, 6);
      setRecJobs(ranked.slice(0, 8));
    } catch (err) {
      setRecError(err.message);
    } finally {
      setRecLoading(false);
    }
  }

  useEffect(() => {
    if ((section === "recommended" || section === "overview") && recJobs === null && !recLoading) loadRecommended();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const active = applications.filter((a) => a.status !== "WITHDRAWN").length;
  const accepted = applications.filter((a) => a.status === "ACCEPTED").length;
  const interviews = applications.filter((a) => a.interviewAt).length;

  // Counts per status for the overview bar chart.
  const STATUS_SHORT = { SUBMITTED: "Sent", REVIEWED: "Reviewed", ACCEPTED: "Accepted", REJECTED: "Rejected", WITHDRAWN: "Withdrawn" };
  const statusCounts = APPLICATION_STATUSES.map((s) => ({ status: s, label: STATUS_SHORT[s] || s, value: applications.filter((a) => a.status === s).length }));
  const statusMax = Math.max(1, ...statusCounts.map((s) => s.value));
  const ovRows = ovTab === "ALL" ? applications : applications.filter((a) => a.status === ovTab);

  const shown = statusFilter === "ALL" ? applications : applications.filter((a) => a.status === statusFilter);

  function ApplicationsTable({ rows }) {
    if (rows.length === 0) return <p className="dash-muted">Nothing to show here.</p>;
    return (
      <div className="table-wrap table-wrap--flush">
        <table className="dash-table">
          <thead>
            <tr><th>Job</th><th>Location</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{a.job.title}</td>
                <td className="dash-muted">{a.job.location}</td>
                <td>
                  <span className={`pill pill--${statusTone(a.status)}`}>{a.status}</span>
                  {STATUS_UPDATE[a.status] && (
                    <div className="app-update">
                      {STATUS_UPDATE[a.status]}
                      <span className="app-update__date"> · {formatDate(a.updatedAt)}</span>
                    </div>
                  )}
                  {a.interviewAt && (
                    <div className="interview-note">
                      <span className="interview-note__label">📅 Interview</span>
                      {new Date(a.interviewAt).toLocaleString()}
                      {a.interviewLocation && <> · {a.interviewLocation}</>}
                      {a.interviewNote && <div className="interview-note__detail">{a.interviewNote}</div>}
                    </div>
                  )}
                  {a.status === "REJECTED" && a.rejectionReason && (
                    <div className="reject-feedback">
                      <span className="reject-feedback__label">Employer feedback</span>
                      {a.rejectionReason}
                    </div>
                  )}
                </td>
                <td>
                  {["SUBMITTED", "REVIEWED"].includes(a.status) ? (
                    confirmingId === a.id ? (
                      <span className="withdraw-confirm">
                        <span className="withdraw-confirm__q">Withdraw?</span>
                        <button
                          className="link-btn link-btn--danger"
                          onClick={() => confirmWithdraw(a.id)}
                          disabled={withdrawingId === a.id}
                        >
                          {withdrawingId === a.id ? "Withdrawing…" : "Yes"}
                        </button>
                        <button
                          className="link-btn"
                          onClick={() => setConfirmingId(null)}
                          disabled={withdrawingId === a.id}
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button className="link-btn link-btn--danger" onClick={() => { setNotice(""); setConfirmingId(a.id); }}>Withdraw</button>
                    )
                  ) : a.status === "ACCEPTED" && a.job?.employerId ? (
                    <Link className="link-btn" to={`/employers/${a.job.employerId}`}>Review employer</Link>
                  ) : (
                    <span className="dash-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="js-page">
      {/* Horizontal toolbar */}
      <header className="js-toolbar">
        <Link to="/" className="js-brand" aria-label="Akazi home">
          <img src="/logo-light.png" alt="Akazi" className="js-brand__logo" />
        </Link>

        <nav className="js-toolbar__nav" aria-label="Dashboard sections">
          {NAV.map((it) => (
            <button
              key={it.key}
              type="button"
              className={`js-tab ${section === it.key ? "is-active" : ""}`}
              aria-current={section === it.key ? "page" : undefined}
              onClick={() => setSection(it.key)}
            >
              {it.label}
            </button>
          ))}
          <Link to="/jobs" className="js-tab">Browse jobs</Link>
        </nav>

        <div className="js-toolbar__right">
          <button
            type="button"
            className={`bell-btn ${section === "notifications" ? "is-active" : ""}`}
            onClick={() => setSection("notifications")}
            aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
            title="Notifications"
          >
            <Icons.bell />
            {unread > 0 && <span className="bell-badge">{unread > 9 ? "9+" : unread}</span>}
          </button>
          <UserMenu primaryLabel="Homepage" primaryTo="/" className="user-menu--portal" />
        </div>
      </header>

      <div className="js-content">
        {section === "overview" && (
          <div className="dl-topbar-block">
            <h1 className="dl-welcome">Welcome back, {user.fullName.split(" ")[0]}</h1>
            <p className="dl-subtitle">Track your applications and find your next role.</p>
          </div>
        )}

        {error && <div className="form-error" role="alert">{error}</div>}
        {notice && <div className="form-success" role="status">{notice}</div>}

        {loading ? (
          <p className="dash-muted">Loading your applications…</p>
        ) : section === "overview" ? (
          <>
            {/* KPI cards */}
            <div className="stat-grid">
              <StatTile label="Applications" value={applications.length} hint="Total submitted" />
              <StatTile label="Active" value={active} hint="Still in the running" />
              <StatTile label="Interviews" value={interviews} hint="Scheduled" />
              <StatTile label="Accepted" value={accepted} hint="Offers received" />
            </div>

            {/* Charts / summary row */}
            <div className="dash-cols">
              <section className="panel ov-chart">
                <div className="ov-chart__head">
                  <h2 className="panel__title">Applications by status</h2>
                  <div className="ov-chart__total">{applications.length}<span> total</span></div>
                </div>
                {applications.length === 0 ? (
                  <p className="dash-muted">No applications yet. <Link to="/jobs">Browse listings</Link> to get started.</p>
                ) : (
                  <div className="vchart" role="img" aria-label="Applications by status">
                    {statusCounts.map((s) => (
                      <div className="vbar" key={s.status}>
                        <div className="vbar__track">
                          <div className="vbar__fill" style={{ height: `${(s.value / statusMax) * 100}%` }}>
                            {s.value > 0 && <span className="vbar__value">{s.value}</span>}
                          </div>
                        </div>
                        <span className="vbar__label">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <Panel
                title="Recommended for you"
                action={<button className="link-btn" onClick={() => setSection("recommended")}>View all</button>}
              >
                {recJobs === null ? (
                  <p className="dash-muted">Finding roles that match your skills…</p>
                ) : !skills.length ? (
                  <p className="dash-muted">Add your skills in <button className="link-btn" onClick={() => setSection("documents")}>Documents &amp; portfolio</button> to get tailored picks.</p>
                ) : recJobs.length === 0 ? (
                  <p className="dash-muted">No matches yet. <Link to="/jobs">Browse all jobs</Link>.</p>
                ) : (
                  <ul className="mini-list">
                    {recJobs.slice(0, 4).map(({ job }) => (
                      <li className="mini-item" key={job.id}>
                        <span className="mini-item__icon"><Icons.briefcase /></span>
                        <div className="mini-item__body">
                          <Link to={`/jobs/${job.id}`} className="mini-item__title">{job.title}</Link>
                          <span className="mini-item__meta">{job.industry} · {job.location}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            {/* Tabbed data table */}
            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Recent applications</h2>
                <button className="link-btn" onClick={() => setSection("applications")}>View all</button>
              </div>
              <div className="ov-tabs" role="tablist" aria-label="Filter applications">
                {["ALL", ...APPLICATION_STATUSES].map((s) => {
                  const count = s === "ALL" ? applications.length : applications.filter((a) => a.status === s).length;
                  if (s !== "ALL" && count === 0) return null;
                  return (
                    <button key={s} type="button" role="tab" aria-selected={ovTab === s} className={`ov-tab ${ovTab === s ? "is-active" : ""}`} onClick={() => setOvTab(s)}>
                      {s === "ALL" ? "All" : s}{count ? <span className="ov-tab__count">{count}</span> : null}
                    </button>
                  );
                })}
              </div>
              {applications.length === 0 ? (
                <p className="dash-muted">You haven't applied to any jobs yet. <Link to="/jobs">Browse listings</Link> to get started.</p>
              ) : (
                <ApplicationsTable rows={ovRows.slice(0, 6)} />
              )}
            </section>
          </>
        ) : section === "applications" ? (
          <Panel title="Your applications">
            {applications.length === 0 ? (
              <p className="dash-muted">You haven't applied to any jobs yet. <Link to="/jobs">Browse listings</Link> to get started.</p>
            ) : (
              <>
                <div className="applicant-filter" role="tablist" aria-label="Filter by status">
                  {["ALL", ...APPLICATION_STATUSES].map((s) => {
                    const count = s === "ALL" ? applications.length : applications.filter((a) => a.status === s).length;
                    // Always offer All / Accepted / Rejected; show the rest only when present.
                    const alwaysShow = s === "ALL" || s === "ACCEPTED" || s === "REJECTED";
                    if (!alwaysShow && count === 0) return null;
                    return (
                      <button key={s} type="button" className={`applicant-chip ${statusFilter === s ? "is-active" : ""}`} aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)}>
                        {s === "ALL" ? "All" : s} ({count})
                      </button>
                    );
                  })}
                </div>
                {statusFilter === "REJECTED" ? (
                  shown.length === 0 ? (
                    <p className="dash-muted">No rejected applications — good luck with the ones still open!</p>
                  ) : (
                    <ul className="rejected-list">
                      {shown.map((a) => (
                        <li className="rejected-card" key={a.id}>
                          <div className="rejected-card__head">
                            <div>
                              <div className="rejected-card__title">{a.job.title}</div>
                              <div className="dash-muted rejected-card__meta">{a.job.location} · Updated {formatDate(a.updatedAt)}</div>
                            </div>
                            <span className="pill pill--bad">REJECTED</span>
                          </div>
                          {a.rejectionReason ? (
                            <div className="reject-feedback">
                              <span className="reject-feedback__label">Employer feedback</span>
                              {a.rejectionReason}
                            </div>
                          ) : (
                            <p className="dash-muted rejected-card__nofeedback">The employer didn't leave feedback for this application.</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <ApplicationsTable rows={shown} />
                )}
              </>
            )}
          </Panel>
        ) : section === "documents" ? (
          <DocumentsPortfolio />
        ) : section === "saved" ? (
          <SeekerSaved />
        ) : section === "notifications" ? (
          <Panel title="Notifications">
            <NotificationsPanel onChange={setUnread} />
          </Panel>
        ) : (
          <Panel title="Recommended for you">
            {recLoading ? (
              <p className="dash-muted">Finding roles that match your skills…</p>
            ) : recError ? (
              <div className="form-error" role="alert">{recError}</div>
            ) : !skills.length ? (
              <p className="dash-muted">
                Add your skills to get tailored recommendations. <Link to="/profile">Update your profile</Link> to get started.
              </p>
            ) : recJobs && recJobs.length === 0 ? (
              <p className="dash-muted">
                No matches for your skills right now. <Link to="/jobs">Browse all jobs</Link> to keep looking.
              </p>
            ) : (
              <div className="rec-list">
                {(recJobs || []).map(({ job, matched }) => {
                  return (
                    <article className="rec-card" key={job.id}>
                      <div className="rec-card__head">
                        <div className="job-card__icon"><Icons.briefcase /></div>
                        <div className="rec-card__headtext">
                          <div className="job-card__titlerow">
                            <h3><Link to={`/jobs/${job.id}`} className="job-card__titlelink">{job.title}</Link></h3>
                            <span className="job-tag">{jobTypeLabel(job.jobType)}</span>
                          </div>
                          <p className="job-card__meta">{job.industry} · {job.location}</p>
                        </div>
                      </div>

                      <dl className="rec-facts">
                        <div className="rec-fact"><dt>Type</dt><dd>{jobTypeLabel(job.jobType)}</dd></div>
                        <div className="rec-fact"><dt>Location</dt><dd>{job.location}</dd></div>
                        <div className="rec-fact"><dt>Posted</dt><dd>{daysAgo(job.createdAt)}d ago</dd></div>
                        {job.employer?.fullName && (<div className="rec-fact"><dt>Employer</dt><dd>{job.employer.fullName}</dd></div>)}
                      </dl>

                      {matched.length > 0 && (
                        <div className="rec-card__match">
                          <span className="rec-card__match-label">Matches your skills:</span>
                          <div className="rec-chips">
                            {matched.map((s) => <span className="skill-chip skill-chip--static" key={s}>{s}</span>)}
                          </div>
                        </div>
                      )}

                      <div className="rec-card__actions">
                        <Link to={`/jobs/${job.id}`} className="job-card__apply">View & apply →</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
