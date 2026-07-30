import { Fragment, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import DashboardLayout from "../../components/DashboardLayout";
import { Panel } from "../../components/DashWidgets";
import { AreaChart, ShareBar } from "../../components/Charts";
import { StarRatingDisplay } from "../../components/StarRating";
import { JOB_TYPES, jobTypeLabel } from "../../constants/jobTypes";
import { APPLICATION_STATUSES, EMPLOYER_SETTABLE_STATUSES, statusTone } from "../../constants/applicationStatus";
import EmployerTalent from "./EmployerTalent";
import EmployerApplicants from "./EmployerApplicants";
import CompanyProfile from "./CompanyProfile";
import { useSectionParam } from "../../hooks/useSectionParam";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

const EMPLOYER_STATUS = {
  PENDING: { label: "Under review", tone: "warn" },
  VERIFIED: { label: "Verified", tone: "ok" },
  REJECTED: { label: "Rejected", tone: "bad" },
};

const EMPTY_JOB = {
  title: "", description: "", location: "", industry: "",
  jobType: JOB_TYPES[0].value, salaryMin: "", salaryMax: "",
  remote: false, openings: "", deadline: "", requiredSkills: [],
};

export default function EmployerDashboard() {
  const { user, token } = useAuth();
  const verified = user.employerStatus === "VERIFIED";
  const status = EMPLOYER_STATUS[user.employerStatus] || EMPLOYER_STATUS.PENDING;

  const [section, setSection] = useSectionParam("overview");
  const [jobs, setJobs] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState(EMPTY_JOB);
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null); // null = creating a new job

  const [openJobId, setOpenJobId] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [openApplicantId, setOpenApplicantId] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [reviewMeta, setReviewMeta] = useState({ total: 0, averageRating: null });

  const [analytics, setAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [applicantSearch, setApplicantSearch] = useState("");
  const [noteDrafts, setNoteDrafts] = useState({}); // { [applicationId]: text }

  async function loadJobs() {
    setLoading(true);
    setError("");
    try {
      const [jobsRes, countsRes, reviewsRes, analyticsRes, notifRes] = await Promise.all([
        api.jobs.mine(token),
        api.jobs.applicantCounts(token),
        api.reviews.forEmployer(user.id, { limit: 20 }).catch(() => null),
        api.jobs.analytics(token).catch(() => null),
        api.notifications.list(token).catch(() => null),
      ]);
      setJobs(jobsRes.jobs);
      const map = {};
      for (const c of countsRes.counts) map[c.jobId] = c._count._all;
      setCounts(map);
      if (reviewsRes) {
        setReviews(reviewsRes.data);
        setReviewMeta(reviewsRes.meta);
      }
      if (analyticsRes) setAnalytics(analyticsRes);
      if (notifRes) {
        setNotifications(notifRes.notifications);
        setUnread(notifRes.unread);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalApplicants = Object.values(counts).reduce((a, b) => a + b, 0);
  const applicantsPerJob = jobs
    .map((j) => ({ label: j.title, value: counts[j.id] || 0 }))
    .filter((j) => j.value > 0)
    .sort((a, b) => b.value - a.value);

  // Derived figures for the template-style overview.
  const series = analytics?.series || [];
  const byStatus = analytics?.byStatus || {};
  const maxSeries = Math.max(0, ...series.map((s) => s.value));
  const maxJobCount = Math.max(1, ...Object.values(counts));
  const avgPerListing = jobs.length ? Math.round(totalApplicants / jobs.length) : 0;
  const weekDelta =
    series.length >= 2 ? series[series.length - 1].value - series[series.length - 2].value : 0;
  const weekDeltaText = `${weekDelta >= 0 ? "+" : "−"}${Math.abs(weekDelta)} this week`;

  const updateField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_JOB);
    setFormError("");
    setSection("post");
  }

  function startEdit(job) {
    setEditingId(job.id);
    setForm({
      title: job.title, description: job.description, location: job.location,
      industry: job.industry, jobType: job.jobType,
      salaryMin: job.salaryMin ?? "", salaryMax: job.salaryMax ?? "",
      remote: Boolean(job.remote), openings: job.openings ?? "",
      deadline: job.deadline ? job.deadline.slice(0, 10) : "",
      requiredSkills: job.requiredSkills || [],
    });
    setFormError("");
    setSection("post");
  }

  const [reqSkillDraft, setReqSkillDraft] = useState("");
  function addReqSkill(raw) {
    const v = raw.trim();
    if (!v) return;
    if (!form.requiredSkills.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setForm((f) => ({ ...f, requiredSkills: [...f.requiredSkills, v] }));
    }
    setReqSkillDraft("");
  }

  async function handlePost(e) {
    e.preventDefault();
    setPosting(true);
    setFormError("");
    try {
      const payload = {
        title: form.title, description: form.description, location: form.location,
        industry: form.industry, jobType: form.jobType,
        // Send salary bounds explicitly (null clears them when editing).
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        remote: form.remote,
        requiredSkills: form.requiredSkills,
      };
      // Openings/deadline: send the value when set; when editing, send null to
      // clear. On create we omit empty ones (the create schema doesn't take null).
      if (form.openings) payload.openings = Number(form.openings);
      else if (editingId) payload.openings = null;
      if (form.deadline) payload.deadline = form.deadline;
      else if (editingId) payload.deadline = null;

      if (editingId) {
        await api.jobs.update(editingId, payload, token);
      } else {
        await api.jobs.create(payload, token);
      }
      setForm(EMPTY_JOB);
      setEditingId(null);
      await loadJobs();
      setSection("listings");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function toggleClose(job) {
    const nextStatus = job.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await api.jobs.update(job.id, { status: nextStatus }, token);
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: nextStatus } : j)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this listing? This can't be undone.")) return;
    try {
      await api.jobs.remove(id, token);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      if (openJobId === id) setOpenJobId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleApplicants(jobId) {
    if (openJobId === jobId) { setOpenJobId(null); return; }
    setOpenJobId(jobId);
    setStatusFilter("ALL");
    setApplicantsLoading(true);
    try {
      const res = await api.applications.forJob(jobId, token);
      setApplicants(res.applications);
    } catch (err) {
      setError(err.message);
    } finally {
      setApplicantsLoading(false);
    }
  }

  async function changeStatus(applicationId, s) {
    // Rejecting requires a reason (the candidate receives it). For the richer
    // inline flow, use the Applicants section; here we ask for it inline.
    let reason;
    if (s === "REJECTED") {
      reason = window.prompt("Reason for rejecting this applicant (the candidate will see this):");
      if (reason == null || !reason.trim()) return; // cancelled or empty
    }
    try {
      await api.applications.setStatus(applicationId, s, token, reason);
      setApplicants((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status: s } : a)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleShortlist(a) {
    try {
      const res = await api.applications.review(a.id, { shortlisted: !a.shortlisted }, token);
      setApplicants((prev) => prev.map((x) => (x.id === a.id ? { ...x, shortlisted: res.application.shortlisted } : x)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveNote(a) {
    try {
      const note = noteDrafts[a.id] ?? a.employerNote ?? "";
      const res = await api.applications.review(a.id, { note }, token);
      setApplicants((prev) => prev.map((x) => (x.id === a.id ? { ...x, employerNote: res.application.employerNote } : x)));
      setNoteDrafts((d) => ({ ...d, [a.id]: undefined }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function markAllNotificationsRead() {
    try {
      await api.notifications.markAllRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch (err) {
      setError(err.message);
    }
  }

  const navItems = [
    { key: "overview", label: "Overview" },
    { key: "listings", label: "My listings" },
    { key: "applicants", label: "Applicants" },
    { key: "talent", label: "Find talent" },
    ...(verified ? [{ key: "post", label: "Post a job" }] : []),
    { key: "notifications", label: `Notifications${unread ? ` (${unread})` : ""}` },
    { key: "reviews", label: "Reviews" },
    { key: "company", label: "Company profile" },
  ];

  const headerAction = (
    <div className="emp-header-actions">
      <button
        type="button"
        className={`notif-bell ${unread ? "has-unread" : ""}`}
        onClick={() => setSection("notifications")}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <BellIcon />
        {unread > 0 && <span className="notif-bell__badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {verified && <button className="btn-primary btn-sm" onClick={openCreateForm}>+ Post a job</button>}
    </div>
  );

  return (
    <DashboardLayout
      navItems={navItems}
      active={section}
      onNavigate={(k) => (k === "post" ? openCreateForm() : setSection(k))}
      title={section === "overview" ? `Welcome back, ${user.fullName.split(" ")[0]}` : undefined}
      subtitle={section === "overview" ? "Post listings and review the people applying to them." : undefined}
      actions={headerAction}
      hideIcons
    >
      {!verified && (
        <div className="dash-banner">
          Your employer account is <strong>{status.label.toLowerCase()}</strong>. An admin must verify
          it before your job listings go live.
        </div>
      )}
      {error && <div className="form-error" role="alert">{error}</div>}

      {loading ? (
        <p className="dash-muted">Loading…</p>
      ) : section === "overview" ? (
        <div className="emp-overview">
          {/* Listings — horizontal scroller (template's "Your Stock Portfolio") */}
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Your listings</h2>
              <button type="button" className="link-btn" onClick={() => setSection("listings")}>
                View all →
              </button>
            </div>
            {jobs.length === 0 ? (
              <p className="dash-muted">
                No listings yet.{verified ? " Post a job to see it here." : ""}
              </p>
            ) : (
              <div className="listing-scroller">
                {jobs.map((job) => {
                  const c = counts[job.id] || 0;
                  const live = job.status === "PUBLISHED";
                  return (
                    <article className="listing-card" key={job.id}>
                      <div className="listing-card__top">
                        <span className="listing-card__badge">{jobTypeLabel(job.jobType)}</span>
                        <span className={`listing-card__state ${live ? "is-live" : ""}`}>
                          {live ? "Live" : job.status === "REMOVED" ? "Removed" : "Closed"}
                        </span>
                      </div>
                      <h3 className="listing-card__title" title={job.title}>{job.title}</h3>
                      <div className="listing-card__metric">
                        <span className="listing-card__count">{c}</span>
                        <span className="listing-card__unit">applicant{c === 1 ? "" : "s"}</span>
                      </div>
                      <ShareBar value={c} max={maxJobCount} />
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Hero chart + details column (template's "Watchlists" + "Details") */}
          <div className="overview-hero">
            <section className="panel hero-panel">
              <div className="panel__head">
                <div>
                  <h2 className="panel__title">Applications</h2>
                  <span className="hero-caption">Applicants received over time</span>
                </div>
                <span className="hero-range">Last 8 weeks</span>
              </div>
              <div className="hero-figure">
                <span className="hero-figure__num">{analytics?.total ?? totalApplicants}</span>
                {series.some((s) => s.value > 0) && (
                  <span className="hero-figure__delta">{weekDeltaText}</span>
                )}
              </div>
              <AreaChart data={series} valueLabel="Applications" />
            </section>

            <div className="overview-side">
              <section className="panel details-panel">
                <div className="panel__head"><h2 className="panel__title">Details</h2></div>
                <dl className="detail-list">
                  <div className="detail-row"><dt>Active listings</dt><dd>{jobs.length}</dd></div>
                  <div className="detail-row"><dt>Total applicants</dt><dd>{totalApplicants}</dd></div>
                  <div className="detail-row"><dt>Avg / listing</dt><dd>{avgPerListing}</dd></div>
                  <div className="detail-row"><dt>Reviewed</dt><dd>{byStatus.REVIEWED || 0}</dd></div>
                  <div className="detail-row"><dt>Accepted</dt><dd>{byStatus.ACCEPTED || 0}</dd></div>
                  <div className="detail-row">
                    <dt>Average rating</dt>
                    <dd>{reviewMeta.averageRating != null ? `${reviewMeta.averageRating.toFixed(1)} ★` : "—"}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Account status</dt>
                    <dd><span className={`pill pill--${status.tone}`}>{status.label}</span></dd>
                  </div>
                </dl>
              </section>

              {/* small highlight card (template's "Market Cap") */}
              <section className="panel highlight-card">
                <div className="highlight-card__body">
                  <span className="highlight-card__label">Total applicants</span>
                  <span className="highlight-card__value">{totalApplicants}</span>
                </div>
                <div className="highlight-card__spark" aria-hidden="true">
                  {series.slice(-7).map((d, i) => (
                    <span
                      key={i}
                      className="hbar"
                      style={{ height: `${maxSeries ? Math.max(10, (d.value / maxSeries) * 100) : 10}%` }}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : section === "applicants" ? (
        <EmployerApplicants />
      ) : section === "talent" ? (
        <EmployerTalent />
      ) : section === "company" ? (
        <CompanyProfile />
      ) : section === "notifications" ? (
        <Panel
          title="Notifications"
          action={unread > 0 ? <button className="link-btn" onClick={markAllNotificationsRead}>Mark all read</button> : null}
        >
          {notifications.length === 0 ? (
            <p className="dash-muted">No notifications yet.</p>
          ) : (
            <ul className="notif-list">
              {notifications.map((n) => (
                <li key={n.id} className={`notif-item ${n.read ? "" : "is-unread"}`}>
                  <span className="notif-item__dot" aria-hidden="true" />
                  <div className="notif-item__body">
                    <p className="notif-item__msg">{n.message}</p>
                    <span className="notif-item__time">{formatDate(n.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : section === "reviews" ? (
        <Panel title="Reviews from candidates">
          <div className="emp-reviews-summary">
            {reviewMeta.averageRating != null ? (
              <StarRatingDisplay value={reviewMeta.averageRating} count={reviewMeta.total} size="1.2rem" />
            ) : (
              <span className="dash-muted">No reviews yet. Candidates can review you after you accept them.</span>
            )}
          </div>
          {reviews.length > 0 && (
            <ul className="review-list">
              {reviews.map((r) => (
                <li key={r.id} className="review-item">
                  <div className="review-item__avatar">
                    {r.author?.avatarUrl ? (
                      <img src={r.author.avatarUrl} alt={r.author.fullName} />
                    ) : (
                      <span>{(r.author?.fullName || "?").trim().charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="review-item__body">
                    <div className="review-item__top">
                      <span className="review-item__author">{r.author?.fullName || "A candidate"}</span>
                      <StarRatingDisplay value={r.rating} size=".9rem" />
                      <span className="review-item__date dash-muted">{formatDate(r.createdAt)}</span>
                    </div>
                    <p className="review-item__comment">{r.comment}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : section === "post" ? (
        <Panel title={editingId ? "Edit job" : "Post a job"}>
          <form className="post-job-card post-job-card--flush" onSubmit={handlePost}>
            {formError && <div className="form-error" role="alert">{formError}</div>}
            <div className="field">
              <label htmlFor="title">Job title</label>
              <input id="title" required value={form.title} onChange={updateField("title")} placeholder="Senior Backend Engineer" />
            </div>
            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea id="description" required rows={4} value={form.description} onChange={updateField("description")} placeholder="Describe the role (min 20 characters)." />
            </div>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="location">Location</label>
                <input id="location" required value={form.location} onChange={updateField("location")} placeholder="Kigali" />
              </div>
              <div className="field">
                <label htmlFor="industry">Industry</label>
                <input id="industry" required value={form.industry} onChange={updateField("industry")} placeholder="Technology" />
              </div>
            </div>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="jobType">Job type</label>
                <select id="jobType" value={form.jobType} onChange={updateField("jobType")}>
                  {JOB_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Salary range (optional)</label>
                <div className="salary-inputs">
                  <input type="number" min="0" value={form.salaryMin} onChange={updateField("salaryMin")} placeholder="Min" />
                  <input type="number" min="0" value={form.salaryMax} onChange={updateField("salaryMax")} placeholder="Max" />
                </div>
              </div>
            </div>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="openings"># of openings (optional)</label>
                <input id="openings" type="number" min="1" value={form.openings} onChange={updateField("openings")} placeholder="1" />
              </div>
              <div className="field">
                <label htmlFor="deadline">Application deadline (optional)</label>
                <input id="deadline" type="date" value={form.deadline} onChange={updateField("deadline")} />
              </div>
            </div>
            <label className="check-field">
              <input type="checkbox" checked={form.remote} onChange={(e) => setForm({ ...form, remote: e.target.checked })} />
              <span>This role can be done remotely</span>
            </label>
            <div className="field">
              <label htmlFor="reqSkills">Required skills (optional)</label>
              <div className="skills-input">
                {form.requiredSkills.map((s) => (
                  <span className="skill-chip" key={s}>
                    {s}
                    <button type="button" aria-label={`Remove ${s}`} onClick={() => setForm((f) => ({ ...f, requiredSkills: f.requiredSkills.filter((x) => x !== s) }))}>×</button>
                  </span>
                ))}
                <input
                  id="reqSkills"
                  value={reqSkillDraft}
                  onChange={(e) => setReqSkillDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addReqSkill(reqSkillDraft); } }}
                  onBlur={() => addReqSkill(reqSkillDraft)}
                  placeholder={form.requiredSkills.length ? "Add another…" : "e.g. React"}
                />
              </div>
              <span className="field-hint">Press Enter or comma to add each skill. Helps match the right candidates.</span>
            </div>
            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={posting}>
                {posting ? "Saving…" : editingId ? "Save changes" : "Publish listing"}
              </button>
              {editingId && (
                <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setForm(EMPTY_JOB); setSection("listings"); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Panel>
      ) : (
        <Panel title="Your job listings">
          {jobs.length === 0 ? (
            <p className="dash-muted">You haven't posted any jobs yet.{verified ? " Use “Post a job” to create your first listing." : ""}</p>
          ) : (
            <ul className="job-list">
              {jobs.map((job) => (
                <li key={job.id} className="job-item">
                  <div className="job-item__main">
                    <div>
                      <div className="job-item__title">{job.title}</div>
                      <div className="dash-muted job-item__meta">
                        {job.location} · {job.industry} · {jobTypeLabel(job.jobType)}
                        {job.remote ? " · Remote" : ""}
                        {job.openings ? ` · ${job.openings} opening${job.openings === 1 ? "" : "s"}` : ""}
                        <span className={`pill pill--${job.status === "PUBLISHED" ? "ok" : job.status === "REMOVED" ? "bad" : "muted"}`}>
                          {job.status === "PUBLISHED" ? "Published" : job.status === "REMOVED" ? "Removed" : "Closed"}
                        </span>
                      </div>
                    </div>
                    <div className="job-item__actions">
                      <button className="link-btn" onClick={() => toggleApplicants(job.id)}>
                        {counts[job.id] || 0} applicant{(counts[job.id] || 0) === 1 ? "" : "s"}
                      </button>
                      {job.status !== "REMOVED" && (
                        <>
                          <button className="link-btn" onClick={() => startEdit(job)}>Edit</button>
                          <button className="link-btn" onClick={() => toggleClose(job)}>
                            {job.status === "PUBLISHED" ? "Close" : "Reopen"}
                          </button>
                        </>
                      )}
                      <button className="link-btn link-btn--danger" onClick={() => handleDelete(job.id)}>Delete</button>
                    </div>
                  </div>

                  {openJobId === job.id && (
                    <div className="applicant-panel">
                      {applicantsLoading ? (
                        <p className="dash-muted">Loading applicants…</p>
                      ) : applicants.length === 0 ? (
                        <p className="dash-muted">No applications yet.</p>
                      ) : (
                        <>
                          <div className="applicant-toolbar">
                            <div className="applicant-filter" role="tablist" aria-label="Filter applicants by status">
                              {["ALL", "SHORTLISTED", ...APPLICATION_STATUSES].map((s) => {
                                const count = s === "ALL" ? applicants.length : s === "SHORTLISTED" ? applicants.filter((a) => a.shortlisted).length : applicants.filter((a) => a.status === s).length;
                                if (s !== "ALL" && count === 0) return null;
                                return (
                                  <button key={s} type="button" className={`applicant-chip ${statusFilter === s ? "is-active" : ""}`} aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)}>
                                    {s === "ALL" ? "All" : s === "SHORTLISTED" ? "★ Shortlisted" : s} ({count})
                                  </button>
                                );
                              })}
                            </div>
                            <input
                              className="applicant-search"
                              value={applicantSearch}
                              onChange={(e) => setApplicantSearch(e.target.value)}
                              placeholder="Search name, email, skill…"
                              aria-label="Search applicants"
                            />
                          </div>
                          {(() => {
                            const term = applicantSearch.trim().toLowerCase();
                            let shown = statusFilter === "ALL" ? applicants
                              : statusFilter === "SHORTLISTED" ? applicants.filter((a) => a.shortlisted)
                              : applicants.filter((a) => a.status === statusFilter);
                            if (term) {
                              shown = shown.filter((a) => {
                                const p = a.applicant;
                                return `${p.fullName} ${p.email} ${(p.skills || []).join(" ")}`.toLowerCase().includes(term);
                              });
                            }
                            // Shortlisted candidates float to the top.
                            shown = [...shown].sort((x, y) => Number(y.shortlisted) - Number(x.shortlisted));
                            if (shown.length === 0) return <p className="dash-muted">No applicants match.</p>;
                            return (
                              <div className="table-wrap table-wrap--flush table-scroll">
                              <table className="dash-table">
                                <thead><tr><th>Applicant</th><th>Email</th><th>Status</th></tr></thead>
                                <tbody>
                                  {shown.map((a) => {
                                    const isOpen = openApplicantId === a.id;
                                    const app = a.applicant;
                                    return (
                                      <Fragment key={a.id}>
                                        <tr>
                                          <td>
                                            <div className="applicant-name-cell">
                                              <button
                                                type="button"
                                                className={`shortlist-star ${a.shortlisted ? "is-on" : ""}`}
                                                aria-pressed={a.shortlisted}
                                                title={a.shortlisted ? "Remove from shortlist" : "Add to shortlist"}
                                                onClick={() => toggleShortlist(a)}
                                              >
                                                {a.shortlisted ? "★" : "☆"}
                                              </button>
                                              <button
                                                type="button"
                                                className="applicant-toggle"
                                                aria-expanded={isOpen}
                                                onClick={() => setOpenApplicantId(isOpen ? null : a.id)}
                                              >
                                                <span className={`applicant-toggle__caret ${isOpen ? "is-open" : ""}`}>▸</span>
                                                {app.fullName}
                                              </button>
                                            </div>
                                          </td>
                                          <td className="dash-muted">{app.email}</td>
                                          <td>
                                            <div className="status-cell">
                                              <span className={`pill pill--${statusTone(a.status)}`}>{a.status}</span>
                                              <select className="status-select" value={a.status} onChange={(e) => changeStatus(a.id, e.target.value)} disabled={a.status === "WITHDRAWN"} aria-label={`Change status for ${app.fullName}`}>
                                                {APPLICATION_STATUSES.map((s) => (
                                                  <option key={s} value={s} disabled={!EMPLOYER_SETTABLE_STATUSES.includes(s)}>{s}</option>
                                                ))}
                                              </select>
                                            </div>
                                          </td>
                                        </tr>
                                        {isOpen && (
                                          <tr className="applicant-detail-row">
                                            <td colSpan={3}>
                                              <div className="applicant-detail">
                                                <div className="applicant-detail__grid">
                                                  <div>
                                                    <span className="applicant-detail__label">Phone</span>
                                                    <span>{app.phone || "—"}</span>
                                                  </div>
                                                  <div>
                                                    <span className="applicant-detail__label">Resume</span>
                                                    {app.resumeUrl ? (
                                                      <a href={app.resumeUrl} target="_blank" rel="noreferrer">View resume ↗</a>
                                                    ) : (
                                                      <span className="dash-muted">Not provided</span>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="applicant-detail__block">
                                                  <span className="applicant-detail__label">Skills</span>
                                                  {app.skills?.length ? (
                                                    <div className="applicant-skills">
                                                      {app.skills.map((s) => <span key={s} className="skill-chip skill-chip--static">{s}</span>)}
                                                    </div>
                                                  ) : (
                                                    <span className="dash-muted">None listed</span>
                                                  )}
                                                </div>
                                                <div className="applicant-detail__block">
                                                  <span className="applicant-detail__label">Cover letter</span>
                                                  {a.coverLetter ? (
                                                    <p className="applicant-cover">{a.coverLetter}</p>
                                                  ) : (
                                                    <span className="dash-muted">No cover letter</span>
                                                  )}
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
                                                    <button type="button" className="btn-secondary btn-sm" onClick={() => saveNote(a)} disabled={(noteDrafts[a.id] ?? a.employerNote ?? "") === (a.employerNote ?? "")}>
                                                      Save note
                                                    </button>
                                                    <button type="button" className={`link-btn ${a.shortlisted ? "" : ""}`} onClick={() => toggleShortlist(a)}>
                                                      {a.shortlisted ? "★ Shortlisted" : "☆ Shortlist"}
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </DashboardLayout>
  );
}
