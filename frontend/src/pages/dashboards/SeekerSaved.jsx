import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Panel } from "../../components/DashWidgets";
import { jobTypeLabel, JOB_TYPES } from "../../constants/jobTypes";

// Saved jobs + a single account-linked job alert the seeker manages here.
export default function SeekerSaved() {
  const { token } = useAuth();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [alert, setAlert] = useState(null);
  const [form, setForm] = useState({ keyword: "", location: "", jobType: "" });
  const [alertMsg, setAlertMsg] = useState("");

  async function loadSaved() {
    try {
      const data = await api.savedJobs.list(token);
      setSaved(data.saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  async function loadAlert() {
    try {
      const data = await api.jobAlerts.mine(token);
      setAlert(data.alert);
      if (data.alert) setForm({ keyword: data.alert.keyword || "", location: data.alert.location || "", jobType: data.alert.jobType || "" });
    } catch { /* ignore */ }
  }
  useEffect(() => {
    loadSaved();
    loadAlert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function unsave(jobId) {
    setSaved((prev) => prev.filter((j) => j.id !== jobId));
    try { await api.savedJobs.remove(jobId, token); } catch (err) { setError(err.message); }
  }

  async function saveAlert(e) {
    e.preventDefault();
    setAlertMsg("");
    try {
      const data = await api.jobAlerts.saveMine(form, token);
      setAlert(data.alert);
      setAlertMsg("Alert saved — we'll email you about matching jobs.");
    } catch (err) {
      setAlertMsg(err.message);
    }
  }
  async function removeAlert() {
    try {
      await api.jobAlerts.deleteMine(token);
      setAlert(null);
      setForm({ keyword: "", location: "", jobType: "" });
      setAlertMsg("Alert turned off.");
    } catch (err) {
      setAlertMsg(err.message);
    }
  }

  return (
    <>
      <Panel title="Saved jobs">
        {error && <div className="form-error" role="alert">{error}</div>}
        {loading ? (
          <p className="dash-muted">Loading…</p>
        ) : saved.length === 0 ? (
          <p className="dash-muted">You haven't saved any jobs yet. <Link to="/jobs">Browse jobs</Link> and tap “Save” to keep them here.</p>
        ) : (
          <ul className="mini-list">
            {saved.map((job) => (
              <li className="saved-row" key={job.id}>
                <div className="mini-item__body">
                  <Link to={`/jobs/${job.id}`} className="mini-item__title">{job.title}</Link>
                  <span className="mini-item__meta">{jobTypeLabel(job.jobType)} · {job.location}</span>
                </div>
                <div className="saved-row__actions">
                  <Link to={`/jobs/${job.id}`} className="link-btn">View</Link>
                  <button type="button" className="link-btn link-btn--danger" onClick={() => unsave(job.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Job alert">
        <p className="dash-muted company-profile__intro">Get an email when a new job matches these filters. Leave blank to match all new jobs.</p>
        <form className="post-job-card post-job-card--flush" onSubmit={saveAlert}>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="al-keyword">Keyword</label>
              <input id="al-keyword" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="e.g. React" />
            </div>
            <div className="field">
              <label htmlFor="al-location">Location</label>
              <input id="al-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Kigali" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="al-type">Job type</label>
            <select id="al-type" value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value })}>
              <option value="">Any</option>
              {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {alertMsg && <p className="form-note" role="status">{alertMsg}</p>}
          <div className="form-actions">
            <button className="btn-primary" type="submit">{alert ? "Update alert" : "Turn on alert"}</button>
            {alert && <button type="button" className="btn-secondary" onClick={removeAlert}>Turn off</button>}
          </div>
        </form>
      </Panel>
    </>
  );
}
