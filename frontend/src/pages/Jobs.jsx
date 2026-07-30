import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { JOB_TYPES, jobTypeLabel } from "../constants/jobTypes";
import { useDebounce } from "../hooks/useDebounce";

const SearchIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const PinIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const BriefcaseIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// Whole days since a timestamp, for the "Posted Nd ago" line.
function daysAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

// How many characters of the description to show before "Read more".
const SNIPPET_LEN = 160;

const PAGE_SIZE = 12;

export default function Jobs() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const canApply = user && user.role === "JOB_SEEKER";

  // Filter inputs. Text/number inputs are debounced before they hit the server;
  // the facet buttons apply immediately.
  const [query, setQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebounce(query);
  const debouncedLocation = useDebounce(locationQuery);

  // Server results + pagination meta.
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Facet counts come from /jobs/stats so they're accurate across ALL jobs,
  // not just the current page of results.
  const [facets, setFacets] = useState({ byJobType: [], byLocation: [] });

  // Job-alert subscription state.
  const [alertEmail, setAlertEmail] = useState("");
  const [alertState, setAlertState] = useState(""); // "" | "saving" | "done" | errorMessage

  // Per-job apply state: { [jobId]: "applying" | "applied" | errorMessage }
  const [applyState, setApplyState] = useState({});
  const [applyOpenId, setApplyOpenId] = useState(null); // job showing the cover-letter box
  const [coverDrafts, setCoverDrafts] = useState({});

  // Saved (bookmarked) jobs — only for signed-in seekers.
  const [savedIds, setSavedIds] = useState(new Set());
  useEffect(() => {
    if (!canApply) return;
    api.savedJobs.list(token).then((d) => setSavedIds(new Set(d.jobIds || []))).catch(() => {});
  }, [canApply, token]);

  async function toggleSave(job) {
    if (!canApply) { navigate("/login"); return; }
    const isSaved = savedIds.has(job.id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      isSaved ? next.delete(job.id) : next.add(job.id);
      return next;
    });
    try {
      if (isSaved) await api.savedJobs.remove(job.id, token);
      else await api.savedJobs.save(job.id, token);
    } catch {
      /* revert on failure */
      setSavedIds((prev) => {
        const next = new Set(prev);
        isSaved ? next.add(job.id) : next.delete(job.id);
        return next;
      });
    }
  }

  // Any filter change resets to page 1 (except changing the page itself).
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, debouncedLocation, typeFilter]);

  // Fetch results whenever a (debounced) filter or the page changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    api.jobs
      .search({
        q: debouncedQuery,
        location: debouncedLocation,
        jobType: typeFilter === "ALL" ? "" : typeFilter,
        page,
        limit: PAGE_SIZE,
      })
      .then((data) => {
        if (cancelled) return;
        setJobs(data.jobs || data.data || []);
        setMeta(data.meta || { total: data.total ?? 0, totalPages: 1 });
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
  }, [debouncedQuery, debouncedLocation, typeFilter, page]);

  // Load facets once.
  useEffect(() => {
    let cancelled = false;
    api.jobs
      .stats()
      .then((data) => {
        if (!cancelled) setFacets({ byJobType: data.byJobType || [], byLocation: data.byLocation || [] });
      })
      .catch(() => {
        /* non-critical — the sidebar just won't show counts */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const typeCounts = useMemo(() => {
    const c = {};
    let total = 0;
    for (const row of facets.byJobType) {
      const n = row._count?.jobType ?? 0;
      c[row.jobType] = n;
      total += n;
    }
    c.ALL = total;
    return c;
  }, [facets]);

  const locationCounts = useMemo(
    () =>
      facets.byLocation
        .map((row) => [row.location, row._count?.location ?? 0])
        .sort((a, b) => b[1] - a[1]),
    [facets]
  );

  const hasFilters = query || locationQuery || typeFilter !== "ALL";

  function clearAll() {
    setTypeFilter("ALL");
    setQuery("");
    setLocationQuery("");
  }

  // Opening apply reveals an optional cover-letter box; submitting sends it.
  function openApply(job) {
    if (!canApply) { navigate("/login"); return; }
    setApplyOpenId(job.id);
  }
  async function submitApply(job) {
    setApplyState((s) => ({ ...s, [job.id]: "applying" }));
    try {
      await api.applications.apply(job.id, (coverDrafts[job.id] || "").trim(), token);
      setApplyState((s) => ({ ...s, [job.id]: "applied" }));
      setApplyOpenId(null);
    } catch (err) {
      setApplyState((s) => ({ ...s, [job.id]: err.message }));
    }
  }

  // Subscribe to alerts using whatever filters are currently active, so the
  // subscriber gets notified about jobs like the ones they're browsing.
  async function handleSubscribe(e) {
    e.preventDefault();
    setAlertState("saving");
    try {
      await api.jobAlerts.subscribe({
        email: alertEmail,
        keyword: query.trim() || undefined,
        location: locationQuery.trim() || undefined,
        jobType: typeFilter === "ALL" ? undefined : typeFilter,
      });
      setAlertState("done");
      setAlertEmail("");
    } catch (err) {
      setAlertState(err.message);
    }
  }

  const totalPages = Math.max(1, meta.totalPages || 1);

  return (
    <div className="page page--wide">
      <SiteHeader active="jobs" />

      <main className="jobs-page">
        <header className="jobs-head">
          <h1>Browse Jobs</h1>
          <p>Discover opportunities matched to your profile.</p>
        </header>

        <div className="jobs-search">
          <div className="jobs-search__field">
            <SearchIcon width={18} height={18} />
            <input
              aria-label="Job title or keyword"
              placeholder="Job title or keyword"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="jobs-search__divider" />
          <div className="jobs-search__field">
            <PinIcon width={18} height={18} />
            <input
              aria-label="Location"
              placeholder="Location"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="jobs-layout">
          {/* Filters */}
          <aside className="jobs-filters" aria-label="Filters">
            <div className="jobs-filters__head">
              <h2>Filters</h2>
              <button type="button" className="jobs-link" onClick={clearAll} disabled={!hasFilters}>Clear All</button>
            </div>

            <div className="filter-group">
              <div className="filter-group__head">
                <span>JOB TYPE</span>
                <button type="button" className="jobs-link" onClick={() => setTypeFilter("ALL")}>Clear</button>
              </div>
              <button type="button" className={`filter-opt ${typeFilter === "ALL" ? "is-active" : ""}`} onClick={() => setTypeFilter("ALL")}>
                All{typeCounts.ALL != null ? ` (${typeCounts.ALL})` : ""}
              </button>
              {JOB_TYPES.map((t) => (
                <button key={t.value} type="button" className={`filter-opt ${typeFilter === t.value ? "is-active" : ""}`} onClick={() => setTypeFilter(t.value)}>
                  {t.label}{typeCounts[t.value] != null ? ` (${typeCounts[t.value]})` : ""}
                </button>
              ))}
            </div>

            {locationCounts.length > 0 && (
              <div className="filter-group">
                <div className="filter-group__head">
                  <span>LOCATION</span>
                  <button type="button" className="jobs-link" onClick={() => setLocationQuery("")}>Clear</button>
                </div>
                {locationCounts.map(([loc, count]) => (
                  <button key={loc} type="button" className={`filter-opt ${locationQuery === loc ? "is-active" : ""}`} onClick={() => setLocationQuery(loc)}>
                    {loc} ({count})
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* Results */}
          <section className="jobs-results" aria-label="Job results">
            {loading ? (
              <p className="jobs-count">Loading jobs…</p>
            ) : loadError ? (
              <div className="jobs-empty">Couldn't load jobs: {loadError}</div>
            ) : (
              <>
                <p className="jobs-count">{meta.total} result{meta.total === 1 ? "" : "s"} found</p>

                {jobs.length === 0 && <div className="jobs-empty">No jobs match your filters.</div>}

                {jobs.map((job) => {
                  const state = applyState[job.id];
                  const applied = state === "applied";
                  const applying = state === "applying";
                  const applyError = state && state !== "applied" && state !== "applying" ? state : "";
                  const desc = job.description || "";
                  const isLong = desc.length > SNIPPET_LEN;
                  const snippet = isLong ? `${desc.slice(0, SNIPPET_LEN).trimEnd()}…` : desc;
                  return (
                    <article className="job-card" key={job.id}>
                      <div className="job-card__icon"><BriefcaseIcon width={20} height={20} /></div>
                      <div className="job-card__body">
                        <div className="job-card__titlerow">
                          <h3><Link to={`/jobs/${job.id}`} className="job-card__titlelink">{job.title}</Link></h3>
                          <span className="job-tag">{jobTypeLabel(job.jobType)}</span>
                        </div>
                        <p className="job-card__meta">{job.industry} · {job.location}</p>
                        {desc && (
                          <p className="job-card__desc">
                            {snippet}
                            {isLong && <Link to={`/jobs/${job.id}`} className="job-card__readmore"> Read more</Link>}
                          </p>
                        )}
                        <p className="job-card__posted">
                          Posted {daysAgo(job.createdAt)}d ago
                          {job.employer?.fullName ? ` · ${job.employer.fullName}` : ""}
                        </p>
                        {applyError && <p className="job-card__error" role="alert">{applyError}</p>}
                        {applyOpenId === job.id && !applied && (
                          <div className="job-card__applybox">
                            <textarea
                              rows={3}
                              value={coverDrafts[job.id] || ""}
                              onChange={(e) => setCoverDrafts((d) => ({ ...d, [job.id]: e.target.value }))}
                              placeholder="Cover letter (optional) — tell them why you're a great fit…"
                              aria-label="Cover letter"
                            />
                            <div className="job-card__applybox-actions">
                              <button type="button" className="job-card__apply" onClick={() => submitApply(job)} disabled={applying}>
                                {applying ? "Submitting…" : "Submit application"}
                              </button>
                              <button type="button" className="job-card__details" onClick={() => setApplyOpenId(null)} disabled={applying}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="job-card__cta">
                        <button
                          type="button"
                          className={`job-card__save ${savedIds.has(job.id) ? "is-saved" : ""}`}
                          onClick={() => toggleSave(job)}
                          aria-pressed={savedIds.has(job.id)}
                        >
                          {savedIds.has(job.id) ? "★ Saved" : "☆ Save"}
                        </button>
                        <Link to={`/jobs/${job.id}`} className="job-card__details">View details</Link>
                        {applied ? (
                          <button type="button" className="job-card__apply" disabled>Applied ✓</button>
                        ) : applyOpenId !== job.id ? (
                          <button type="button" className="job-card__apply" onClick={() => openApply(job)}>Apply now →</button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}

                {totalPages > 1 && (
                  <nav className="pager" aria-label="Pagination">
                    <button type="button" className="pager__btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                      ← Prev
                    </button>
                    <span className="pager__status">Page {page} of {totalPages}</span>
                    <button type="button" className="pager__btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                      Next →
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>

          {/* Alerts */}
          <aside className="jobs-alerts">
            <h3>Get job alerts</h3>
            <p>
              {hasFilters
                ? "We'll email you when a job matching your current filters is posted."
                : "Be first to see new openings — we'll email you when a new job is posted."}
            </p>
            <form onSubmit={handleSubscribe}>
              <input
                type="email"
                required
                placeholder="your@email.com"
                aria-label="Email for job alerts"
                value={alertEmail}
                onChange={(e) => { setAlertEmail(e.target.value); if (alertState) setAlertState(""); }}
              />
              <button type="submit" className="jobs-subscribe" disabled={alertState === "saving"}>
                {alertState === "saving" ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
            {alertState === "done" && <p className="jobs-alerts__ok" role="status">You're subscribed — we'll email you when a matching job is posted.</p>}
            {alertState && alertState !== "saving" && alertState !== "done" && (
              <p className="job-card__error" role="alert">{alertState}</p>
            )}
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
