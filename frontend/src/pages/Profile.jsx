import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import SiteHeader from "../components/SiteHeader";
import { ROLE_LABELS } from "../constants/roles";

// Friendly labels for the fields the completion endpoint can report as missing.
const FIELD_LABELS = {
  fullName: "Full name",
  email: "Email address",
  phone: "Phone number",
  skills: "Skills",
};

export default function Profile() {
  const { user, token, updateProfile, uploadAvatar, uploadResume } = useAuth();

  const [fullName, setFullName] = useState(user.fullName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [skills, setSkills] = useState(user.skills || []);
  const [skillDraft, setSkillDraft] = useState("");
  const [availableForFreelance, setAvailableForFreelance] = useState(
    Boolean(user.availableForFreelance)
  );
  const isSeeker = user.role === "JOB_SEEKER";

  const [completion, setCompletion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef(null);
  const initial = (user.fullName || "?").trim().charAt(0).toUpperCase();

  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const resumeInputRef = useRef(null);

  async function handleResumeChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeError("");
    setResumeUploading(true);
    try {
      await uploadResume(file);
    } catch (err) {
      setResumeError(err.message);
    } finally {
      setResumeUploading(false);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // allow re-selecting same file
    }
  }

  async function loadCompletion() {
    try {
      const data = await api.profileCompletion(token);
      setCompletion(data);
    } catch {
      // Non-critical — the meter just won't show.
    }
  }

  useEffect(() => {
    loadCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect unsaved changes so the Save button can be disabled when nothing changed.
  const dirty = useMemo(() => {
    const sameSkills =
      skills.length === (user.skills || []).length &&
      skills.every((s, i) => s === user.skills[i]);
    return (
      fullName !== (user.fullName || "") ||
      phone !== (user.phone || "") ||
      !sameSkills ||
      availableForFreelance !== Boolean(user.availableForFreelance)
    );
  }, [fullName, phone, skills, availableForFreelance, user]);

  function addSkill(raw) {
    const value = raw.trim();
    if (!value) return;
    if (skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setSkillDraft("");
      return;
    }
    setSkills([...skills, value]);
    setSkillDraft("");
  }

  function handleSkillKey(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillDraft);
    } else if (e.key === "Backspace" && !skillDraft && skills.length) {
      setSkills(skills.slice(0, -1));
    }
  }

  function removeSkill(skill) {
    setSkills(skills.filter((s) => s !== skill));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaved(false);

    // Fold any half-typed skill into the list before saving.
    const finalSkills = skillDraft.trim() ? [...skills, skillDraft.trim()] : skills;

    const payload = { fullName, skills: finalSkills };
    if (phone.trim()) payload.phone = phone.trim(); // omit when empty (schema wants 7+ chars)
    if (isSeeker) payload.availableForFreelance = availableForFreelance;

    setSaving(true);
    try {
      await updateProfile(payload);
      setSkills(finalSkills);
      setSkillDraft("");
      setSaved(true);
      loadCompletion();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <div className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <h2>Your profile</h2>
          <div className="dashboard-header__sub">
            <span className="badge">{ROLE_LABELS[user.role]}</span>
            <span className="dash-muted">Keep your details current so employers can reach you.</span>
          </div>
        </div>
        <Link to="/dashboard" className="header-link">← Back to dashboard</Link>
      </div>

      <div className="profile-grid">
        <form className="profile-card" onSubmit={handleSubmit}>
          {error && <div className="form-error" role="alert">{error}</div>}
          {saved && <div className="form-success" role="status">Profile saved.</div>}

          <div className="avatar-field">
            <div className="avatar-preview">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="Your profile picture" /> : <span>{initial}</span>}
            </div>
            <div className="avatar-field__body">
              <span className="field-label">Profile picture</span>
              <div className="avatar-field__actions">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? "Uploading…" : user.avatarUrl ? "Change photo" : "Upload photo"}
                </button>
                <span className="field-hint">JPG, PNG, WEBP or GIF · max 5MB</span>
              </div>
              {avatarError && <p className="avatar-field__error" role="alert">{avatarError}</p>}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                hidden
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
          </div>

          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" value={user.email} disabled title="Email can't be changed" />
            <span className="field-hint">Email is used to sign in and can't be changed here.</span>
          </div>

          <div className="field">
            <label htmlFor="phone">Phone number</label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+250 7XX XXX XXX" />
          </div>

          <div className="field">
            <label htmlFor="skills">Skills</label>
            <div className="skills-input">
              {skills.map((s) => (
                <span className="skill-chip" key={s}>
                  {s}
                  <button type="button" aria-label={`Remove ${s}`} onClick={() => removeSkill(s)}>×</button>
                </span>
              ))}
              <input
                id="skills"
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={handleSkillKey}
                onBlur={() => addSkill(skillDraft)}
                placeholder={skills.length ? "Add another…" : "e.g. JavaScript"}
              />
            </div>
            <span className="field-hint">Press Enter or comma to add each skill.</span>
          </div>

          <div className="field">
            <label>Resume / CV</label>
            <div className="resume-field">
              {user.resumeUrl ? (
                <a className="resume-field__current" href={user.resumeUrl} target="_blank" rel="noreferrer">
                  View current resume
                </a>
              ) : (
                <span className="dash-muted">No resume uploaded yet.</span>
              )}
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => resumeInputRef.current?.click()}
                disabled={resumeUploading}
              >
                {resumeUploading ? "Uploading…" : user.resumeUrl ? "Replace" : "Upload resume"}
              </button>
            </div>
            <span className="field-hint">PDF or Word document · max 5MB. Employers see this when you apply.</span>
            {resumeError && <p className="avatar-field__error" role="alert">{resumeError}</p>}
            <input
              ref={resumeInputRef}
              type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeChange}
              hidden
            />
          </div>

          {isSeeker && (
            <label className="check-field">
              <input
                type="checkbox"
                checked={availableForFreelance}
                onChange={(e) => setAvailableForFreelance(e.target.checked)}
              />
              <span>Open to freelance &amp; contract work</span>
            </label>
          )}

          <button className="btn-primary" type="submit" disabled={saving || !dirty} aria-busy={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <aside className="profile-side">
          <div className="completion-card">
            <h3>Profile completion</h3>
            {completion ? (
              <>
                <div className="completion-meter" role="progressbar" aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="completion-meter__fill" style={{ width: `${completion.percent}%` }} />
                </div>
                <div className="completion-percent">{completion.percent}% complete</div>
                {completion.missingFields.length > 0 ? (
                  <>
                    <p className="dash-muted">Add these to reach 100%:</p>
                    <ul className="completion-missing">
                      {completion.missingFields.map((f) => (
                        <li key={f}>{FIELD_LABELS[f] || f}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="dash-muted">Your profile is complete. 🎉</p>
                )}
              </>
            ) : (
              <p className="dash-muted">Loading…</p>
            )}
          </div>
        </aside>
      </div>
      </div>
    </>
  );
}
