import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { jobTypeLabel } from "../constants/jobTypes";
import { StarRatingDisplay } from "../components/StarRating";

const PinIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

function daysAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const canApply = user && user.role === "JOB_SEEKER";

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [employerRating, setEmployerRating] = useState(null); // { averageRating, total }

  const [applyStatus, setApplyStatus] = useState(""); // "applying" | "applied" | errorMessage
  const [coverLetter, setCoverLetter] = useState("");
  const [applyOpen, setApplyOpen] = useState(false); // reveal the cover-letter step

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    api.jobs
      .get(id)
      .then((data) => {
        if (!cancelled) setJob(data.job);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Once we know the employer, fetch their review summary for the byline.
  useEffect(() => {
    const employerId = job?.employer?.id;
    if (!employerId) return;
    let cancelled = false;
    api.reviews
      .forEmployer(employerId, { limit: 1 })
      .then((data) => {
        if (!cancelled) setEmployerRating({ averageRating: data.meta.averageRating, total: data.meta.total });
      })
      .catch(() => {
        /* non-critical */
      });
    return () => {
      cancelled = true;
    };
  }, [job?.employer?.id]);

  async function handleApply() {
    if (!canApply) {
      navigate("/login");
      return;
    }
    setApplyStatus("applying");
    try {
      await api.applications.apply(job.id, coverLetter.trim(), token);
      setApplyStatus("applied");
    } catch (err) {
      setApplyStatus(err.message);
    }
  }

  const applied = applyStatus === "applied";
  const applying = applyStatus === "applying";
  const applyError = applyStatus && !applied && !applying ? applyStatus : "";

  return (
    <div className="page page--wide">
      <SiteHeader active="jobs" />

      <main className="jobd-page">
        <Link to="/jobs" className="jobd-back">← Back to all jobs</Link>

        {loading ? (
          <p className="dash-muted">Loading job…</p>
        ) : loadError ? (
          <div className="jobs-empty">
            {loadError}
            <div style={{ marginTop: 16 }}>
              <Link to="/jobs" className="lp-btn lp-btn--dark">Browse other jobs</Link>
            </div>
          </div>
        ) : (
          <article className="jobd-card">
            <header className="jobd-head">
              <span className="job-tag">{jobTypeLabel(job.jobType)}</span>
              <h1 className="jobd-title">{job.title}</h1>
              <p className="jobd-meta">
                <PinIcon width={16} height={16} /> {job.location} · {job.industry}
              </p>
              <p className="jobd-posted">
                Posted {daysAgo(job.createdAt)}d ago
                {job.employer?.fullName && (
                  <>
                    {" · by "}
                    {job.employer.id ? (
                      <Link to={`/employers/${job.employer.id}`} className="jobd-employer-link">{job.employer.fullName}</Link>
                    ) : (
                      job.employer.fullName
                    )}
                  </>
                )}
              </p>
              {job.employer?.id && employerRating && (
                <div className="jobd-employer-rating">
                  {employerRating.averageRating != null ? (
                    <Link to={`/employers/${job.employer.id}`} className="jobd-employer-link">
                      <StarRatingDisplay value={employerRating.averageRating} count={employerRating.total} size="0.95rem" />
                    </Link>
                  ) : (
                    <Link to={`/employers/${job.employer.id}`} className="jobd-employer-link dash-muted">No reviews yet</Link>
                  )}
                </div>
              )}
            </header>

            <dl className="jobd-facts">
              <div><dt>Job type</dt><dd>{jobTypeLabel(job.jobType)}{job.remote ? " · Remote" : ""}</dd></div>
              <div><dt>Location</dt><dd>{job.location}</dd></div>
              <div><dt>Industry</dt><dd>{job.industry}</dd></div>
              {job.openings ? <div><dt>Openings</dt><dd>{job.openings}</dd></div> : null}
              {job.deadline ? <div><dt>Apply by</dt><dd>{formatDate(job.deadline)}</dd></div> : null}
            </dl>

            <section className="jobd-section">
              <h2>About this role</h2>
              {/* Description is plain text; preserve the employer's line breaks. */}
              <p className="jobd-description">{job.description}</p>
            </section>

            {job.requiredSkills?.length > 0 && (
              <section className="jobd-section">
                <h2>Required skills</h2>
                <div className="jobd-skills">
                  {job.requiredSkills.map((s) => <span key={s} className="skill-chip skill-chip--static">{s}</span>)}
                </div>
              </section>
            )}

            <div className="jobd-actions">
              {applied ? (
                <>
                  <button type="button" className="job-card__apply" disabled>Applied ✓</button>
                  <p className="jobd-applied-note" role="status">Track this in your dashboard.</p>
                </>
              ) : !canApply ? (
                <button type="button" className="job-card__apply" onClick={() => navigate("/login")}>
                  Sign in to apply →
                </button>
              ) : !applyOpen ? (
                <button type="button" className="job-card__apply" onClick={() => setApplyOpen(true)}>
                  Apply now →
                </button>
              ) : (
                <div className="jobd-apply-form">
                  <h2 className="jobd-apply-form__title">Apply for this role</h2>
                  <div className="jobd-cover">
                    <label htmlFor="coverLetter">Cover letter <span className="dash-muted">(optional)</span></label>
                    <textarea
                      id="coverLetter"
                      rows={5}
                      maxLength={3000}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Tell this employer why you're a great fit…"
                    />
                    <span className="field-hint">A short note helps you stand out — but you can leave it blank.</span>
                  </div>
                  <div className="jobd-apply-form__actions">
                    <button type="button" className="job-card__apply" onClick={handleApply} disabled={applying}>
                      {applying ? "Submitting…" : "Submit application →"}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setApplyOpen(false)} disabled={applying}>
                      Cancel
                    </button>
                  </div>
                  {applyError && <p className="job-card__error" role="alert">{applyError}</p>}
                </div>
              )}
            </div>
          </article>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
