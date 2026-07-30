import { Fragment, useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import DashboardLayout, { Icons } from "../../components/DashboardLayout";
import { StatTile, Panel, BarList } from "../../components/DashWidgets";
import { ROLE_LABELS } from "../../constants/roles";
import { jobTypeLabel } from "../../constants/jobTypes";
import { useDebounce } from "../../hooks/useDebounce";
import { useSectionParam } from "../../hooks/useSectionParam";

// Validated categorical colours (dataviz palette) for the role donut.
const ROLE_COLORS = ["#2a78d6", "#008300", "#e87ba4", "#eda100", "#1baf7a"];

const EMP_STATUS_TONE = { PENDING: "warn", VERIFIED: "ok", REJECTED: "bad" };
const JOB_STATUS_TONE = { PUBLISHED: "ok", DRAFT: "warn", REMOVED: "bad" };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const NAV = [
  { key: "overview", label: "Overview", icon: <Icons.grid /> },
  { key: "users", label: "Users", icon: <Icons.users /> },
  { key: "jobs", label: "Job moderation", icon: <Icons.shield /> },
];

const USERS_PAGE_SIZE = 15;

export default function AdminDashboard() {
  const { user, token } = useAuth();

  const [section, setSection] = useSectionParam("overview");
  const [error, setError] = useState("");

  // Accurate platform-wide stats (not page-1 counts).
  const [stats, setStats] = useState(null);
  const [jobStats, setJobStats] = useState(null);

  // Paginated + filterable user table.
  const [users, setUsers] = useState([]);
  const [usersMeta, setUsersMeta] = useState({ total: 0, totalPages: 1 });
  const [usersLoading, setUsersLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q);

  // Which user row is expanded to show full details (for reviewing employers).
  const [openUserId, setOpenUserId] = useState(null);

  // Job moderation list.
  const [jobs, setJobs] = useState([]);

  const loadStats = useCallback(async () => {
    try {
      const [us, js] = await Promise.all([api.admin.userStats(token), api.jobs.stats()]);
      setStats(us);
      setJobStats(js);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api.admin.listUsers(token, {
        page,
        limit: USERS_PAGE_SIZE,
        q: debouncedQ,
        role: roleFilter,
        status: statusFilter,
      });
      setUsers(res.data || res.users);
      setUsersMeta(res.meta || { total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message);
    } finally {
      setUsersLoading(false);
    }
  }, [token, page, debouncedQ, roleFilter, statusFilter]);

  const loadJobs = useCallback(async () => {
    try {
      const res = await api.admin.listJobs(token, { limit: 100 });
      setJobs(res.jobs || res.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => { loadStats(); loadJobs(); }, [loadStats, loadJobs]);
  useEffect(() => { setPage(1); }, [debouncedQ, roleFilter, statusFilter]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Donut data (users by role) + a conic-gradient string for the ring.
  const roleData = (stats?.byRole || [])
    .map((r) => ({ key: r.role, label: ROLE_LABELS[r.role] || r.role, value: r._count.role }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((d, i) => ({ ...d, color: ROLE_COLORS[i % ROLE_COLORS.length] }));
  const roleTotal = roleData.reduce((s, d) => s + d.value, 0) || 1;
  let _acc = 0;
  const roleConic = roleData
    .map((d) => {
      const start = (_acc / roleTotal) * 100;
      _acc += d.value;
      return `${d.color} ${start}% ${(_acc / roleTotal) * 100}%`;
    })
    .join(", ");

  // Bar charts from job stats.
  const jobTypeBars = (jobStats?.byJobType || [])
    .map((r) => ({ label: jobTypeLabel(r.jobType), value: r._count?.jobType ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const locationBars = (jobStats?.byLocation || [])
    .map((r) => ({ label: r.location, value: r._count?.location ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  async function toggleSuspend(u) {
    try {
      const res = await api.admin.setSuspended(u.id, !u.isSuspended, token);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isSuspended: res.user.isSuspended } : x)));
      loadStats();
    } catch (err) {
      setError(err.message);
    }
  }

  async function setEmployerStatus(u, status) {
    try {
      const res = await api.admin.setEmployerStatus(u.id, status, token);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, employerStatus: res.user.employerStatus } : x)));
      loadStats();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeJob(job) {
    if (!window.confirm(`Remove “${job.title}” from public listings?`)) return;
    try {
      await api.admin.removeJob(job.id, token);
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "REMOVED" } : j)));
      loadStats();
    } catch (err) {
      setError(err.message);
    }
  }

  async function restoreJob(job) {
    try {
      await api.admin.restoreJob(job.id, token);
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "PUBLISHED" } : j)));
      loadStats();
    } catch (err) {
      setError(err.message);
    }
  }

  const usersTotalPages = Math.max(1, usersMeta.totalPages || 1);

  return (
    <DashboardLayout
      navItems={NAV}
      active={section}
      onNavigate={setSection}
      title={`Welcome back, ${user.fullName.split(" ")[0]}`}
      subtitle="Manage users and moderate job listings across Akazi."
      hideIcons
    >
      {error && <div className="form-error" role="alert">{error}</div>}

      {section === "overview" ? (
        <>
          {/* KPI cards */}
          <div className="stat-grid">
            <StatTile label="Total users" value={stats?.totalUsers ?? "—"} hint="All accounts" />
            <StatTile label="Published jobs" value={jobStats?.totalJobs ?? "—"} hint="Live listings" />
            <StatTile
              label="Employers pending"
              value={stats?.pendingEmployers ?? "—"}
              hint={stats?.pendingEmployers ? "Awaiting review" : "All reviewed"}
            />
            <StatTile label="Suspended accounts" value={stats?.suspended ?? "—"} hint="Restricted" />
          </div>

          {/* Users by role — donut + legend */}
          <section className="panel">
            <div className="panel__head"><h2 className="panel__title">Users by role</h2></div>
            {roleData.length === 0 ? (
              <p className="dash-muted">No users yet.</p>
            ) : (
              <div className="donut-row">
                <div className="donut" style={{ background: `conic-gradient(${roleConic})` }} role="img" aria-label="Users by role">
                  <div className="donut__hole">
                    <strong>{stats?.totalUsers ?? 0}</strong>
                    <span>Users</span>
                  </div>
                </div>
                <ul className="donut-legend">
                  {roleData.map((d) => (
                    <li key={d.key}>
                      <span className="donut-legend__dot" style={{ background: d.color }} />
                      <span className="donut-legend__label">{d.label}</span>
                      <span className="donut-legend__val">{d.value}</span>
                      <span className="donut-legend__pct">{Math.round((d.value / roleTotal) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Two-up bar charts */}
          <div className="dash-cols">
            <Panel title="Jobs by type">
              <BarList items={jobTypeBars} empty="No published jobs yet." />
            </Panel>
            <Panel title="Top locations">
              <BarList items={locationBars} empty="No published jobs yet." />
            </Panel>
          </div>
        </>
      ) : section === "users" ? (
        <Panel title="User management">
          <div className="admin-filters">
            <input
              className="admin-search"
              type="search"
              placeholder="Search name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search users"
            />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
              <option value="">All roles</option>
              {Object.entries(ROLE_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {stats?.pendingEmployers > 0 && (
            <div className="admin-pending" role="status">
              <span>
                <strong>{stats.pendingEmployers}</strong> employer{stats.pendingEmployers === 1 ? "" : "s"} awaiting approval —
                open a row to review their details before deciding.
              </span>
              <button type="button" className="link-btn" onClick={() => { setRoleFilter("EMPLOYER"); setStatusFilter(""); }}>
                Show employers
              </button>
            </div>
          )}

          <div className="table-wrap table-wrap--flush table-scroll">
            <table className="dash-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Employer status</th><th>Account</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={6} className="dash-muted">Loading…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="dash-muted">No users match these filters.</td></tr>
                ) : (
                  users.map((u) => {
                    const isOpen = openUserId === u.id;
                    const pendingEmployer = u.role === "EMPLOYER" && u.employerStatus === "PENDING";
                    return (
                      <Fragment key={u.id}>
                        <tr className={u.isSuspended ? "row-muted" : ""}>
                          <td>{u.fullName}{u.id === user.id && <span className="pill pill--muted">you</span>}</td>
                          <td className="dash-muted">{u.email}</td>
                          <td>{ROLE_LABELS[u.role] || u.role}</td>
                          <td>
                            {u.role === "EMPLOYER" ? (
                              <span className={`pill pill--${EMP_STATUS_TONE[u.employerStatus]}`}>{u.employerStatus}</span>
                            ) : (
                              <span className="dash-muted">—</span>
                            )}
                          </td>
                          <td>{u.isSuspended ? <span className="pill pill--bad">Suspended</span> : <span className="pill pill--ok">Active</span>}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                type="button"
                                className={`link-btn ${pendingEmployer ? "link-btn--strong" : ""}`}
                                aria-expanded={isOpen}
                                onClick={() => setOpenUserId(isOpen ? null : u.id)}
                              >
                                {isOpen ? "Hide" : pendingEmployer ? "Review →" : "View details"}
                              </button>
                              {u.id !== user.id && (
                                <button className="link-btn" onClick={() => toggleSuspend(u)}>{u.isSuspended ? "Unsuspend" : "Suspend"}</button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr className="applicant-detail-row">
                            <td colSpan={6}>
                              <div className="applicant-detail user-detail">
                                <div className="user-detail__head">
                                  <div className="user-detail__avatar">
                                    {u.avatarUrl ? <img src={u.avatarUrl} alt={u.fullName} /> : <span>{(u.fullName || "?").trim().charAt(0).toUpperCase()}</span>}
                                  </div>
                                  <div className="user-detail__id">
                                    <div className="user-detail__name">{u.fullName}</div>
                                    <div className="dash-muted">{u.email}</div>
                                    {u.headline && <div className="user-detail__headline">{u.headline}</div>}
                                  </div>
                                </div>

                                <div className="applicant-detail__grid">
                                  <div><span className="applicant-detail__label">Role</span><span>{ROLE_LABELS[u.role] || u.role}</span></div>
                                  <div><span className="applicant-detail__label">Phone</span><span>{u.phone || "—"}</span></div>
                                  <div><span className="applicant-detail__label">Location</span><span>{u.location || "—"}</span></div>
                                  <div>
                                    <span className="applicant-detail__label">Website</span>
                                    {u.website ? <a href={/^https?:\/\//.test(u.website) ? u.website : `https://${u.website}`} target="_blank" rel="noreferrer">{u.website}</a> : <span>—</span>}
                                  </div>
                                  <div><span className="applicant-detail__label">Joined</span><span>{formatDate(u.createdAt)}</span></div>
                                  {u.role === "EMPLOYER" && (
                                    <div><span className="applicant-detail__label">Jobs posted</span><span>{u._count?.jobsPosted ?? 0}</span></div>
                                  )}
                                </div>

                                {u.bio && (
                                  <div className="applicant-detail__block">
                                    <span className="applicant-detail__label">About</span>
                                    <p className="applicant-cover">{u.bio}</p>
                                  </div>
                                )}

                                {u.role === "EMPLOYER" && (
                                  <div className="user-detail__approval">
                                    <span className="applicant-detail__label">Employer approval</span>
                                    <div className="user-detail__approval-row">
                                      <span className={`pill pill--${EMP_STATUS_TONE[u.employerStatus]}`}>{u.employerStatus}</span>
                                      {u.employerStatus !== "VERIFIED" && (
                                        <button className="btn-primary btn-sm" onClick={() => setEmployerStatus(u, "VERIFIED")}>Verify employer</button>
                                      )}
                                      {u.employerStatus !== "REJECTED" && (
                                        <button className="btn-secondary btn-sm" onClick={() => setEmployerStatus(u, "REJECTED")}>Reject</button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {usersTotalPages > 1 && (
            <nav className="pager" aria-label="Users pagination">
              <button type="button" className="pager__btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
              <span className="pager__status">Page {page} of {usersTotalPages} · {usersMeta.total} users</span>
              <button type="button" className="pager__btn" onClick={() => setPage((p) => Math.min(usersTotalPages, p + 1))} disabled={page >= usersTotalPages}>Next →</button>
            </nav>
          )}
        </Panel>
      ) : (
        <Panel title="Job moderation">
          {jobs.length === 0 ? (
            <p className="dash-muted">No job listings to moderate.</p>
          ) : (
            <div className="table-wrap table-wrap--flush">
              <table className="dash-table">
                <thead>
                  <tr><th>Title</th><th>Employer</th><th>Location</th><th>Status</th><th>Applicants</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className={job.status === "REMOVED" ? "row-muted" : ""}>
                      <td>{job.title}</td>
                      <td className="dash-muted">{job.employer?.fullName || "—"}</td>
                      <td>{job.location}</td>
                      <td><span className={`pill pill--${JOB_STATUS_TONE[job.status] || "muted"}`}>{job.status}</span></td>
                      <td>{job._count?.applications ?? 0}</td>
                      <td>
                        {job.status === "REMOVED" ? (
                          <button className="link-btn" onClick={() => restoreJob(job)}>Restore</button>
                        ) : (
                          <button className="link-btn link-btn--danger" onClick={() => removeJob(job)}>Remove</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </DashboardLayout>
  );
}
