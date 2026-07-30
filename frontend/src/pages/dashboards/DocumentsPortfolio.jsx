import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Icons } from "../../components/DashboardLayout";

// A blank row for the repeatable sections.
const emptyExperience = () => ({ title: "", organization: "", period: "", description: "" });
const emptyProject = () => ({ name: "", description: "", link: "" });

// The "Documents & portfolio" tab doubles as the seeker's account editor:
// every section is edited inline here — no navigation to a separate page.
export default function DocumentsPortfolio() {
  const { user, token, updateProfile, uploadResume, uploadAvatar } = useAuth();

  const initial = (user.fullName || "?").trim().charAt(0).toUpperCase();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => buildForm(user));
  const [skillDraft, setSkillDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [completion, setCompletion] = useState(null);

  // Resume + avatar upload (their own endpoints — persist immediately).
  const resumeInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Extra documents / certificates.
  const certInputRef = useRef(null);
  const [certs, setCerts] = useState([]);
  const [certUploading, setCertUploading] = useState(false);
  const [certError, setCertError] = useState("");

  function loadCompletion() {
    api.profileCompletion(token).then(setCompletion).catch(() => {});
  }
  function loadCerts() {
    api.documents.list(token).then((d) => setCerts(d.documents)).catch(() => {});
  }
  useEffect(() => {
    loadCompletion();
    loadCerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCertChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertError("");
    setCertUploading(true);
    try {
      const { document } = await api.documents.upload(file, file.name, token);
      setCerts((prev) => [document, ...prev]);
    } catch (err) {
      setCertError(err.message);
    } finally {
      setCertUploading(false);
      if (certInputRef.current) certInputRef.current.value = "";
    }
  }
  async function removeCert(id) {
    setCerts((prev) => prev.filter((c) => c.id !== id));
    try { await api.documents.remove(id, token); } catch (err) { setCertError(err.message); }
  }

  // Read-only views of the stored data.
  const skills = user.skills || [];
  const experiences = Array.isArray(user.experiences) ? user.experiences : [];
  const projects = Array.isArray(user.projects) ? user.projects : [];
  const headline = user.headline || (skills.length ? skills.slice(0, 2).join(" · ") : "");

  function startEdit() {
    setForm(buildForm(user));
    setSkillDraft("");
    setError("");
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
    setError("");
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Skills chip editor
  function addSkill(raw) {
    const value = raw.trim();
    if (!value) return;
    if (form.skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setSkillDraft("");
      return;
    }
    set("skills", [...form.skills, value]);
    setSkillDraft("");
  }
  function handleSkillKey(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillDraft);
    } else if (e.key === "Backspace" && !skillDraft && form.skills.length) {
      set("skills", form.skills.slice(0, -1));
    }
  }

  // Repeatable list helpers (experiences / projects)
  function updateItem(key, index, field, value) {
    set(key, form[key].map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }
  function addItem(key, factory) {
    set(key, [...form[key], factory()]);
  }
  function removeItem(key, index) {
    set(key, form[key].filter((_, i) => i !== index));
  }

  async function save() {
    setError("");
    const finalSkills = skillDraft.trim() ? [...form.skills, skillDraft.trim()] : form.skills;
    const payload = {
      fullName: form.fullName.trim(),
      headline: form.headline.trim(),
      bio: form.bio.trim(),
      location: form.location.trim(),
      availableForFreelance: form.availableForFreelance,
      skills: finalSkills,
      experiences: form.experiences
        .filter((e) => e.title.trim())
        .map((e) => ({
          title: e.title.trim(),
          organization: e.organization.trim(),
          period: e.period.trim(),
          description: e.description.trim(),
        })),
      projects: form.projects
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name.trim(),
          description: p.description.trim(),
          link: p.link.trim(),
        })),
    };
    if (form.phone.trim()) payload.phone = form.phone.trim();

    setSaving(true);
    try {
      await updateProfile(payload);
      setEditing(false);
      loadCompletion();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

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
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  return (
    <div className="tp">
      {/* Profile header */}
      <section className="tp-card tp-header">
        <div className="tp-avatar">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{initial}</span>}
          {editing && (
            <button
              type="button"
              className="tp-avatar__edit"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              title="Change photo"
            >
              {avatarUploading ? "…" : "Change"}
            </button>
          )}
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarChange} hidden />
        </div>

        <div className="tp-header__info">
          <div className="tp-header__top">
            <div className="tp-header__names">
              {editing ? (
                <>
                  <input className="tp-input tp-input--name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Full name" aria-label="Full name" />
                  <input className="tp-input" value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Headline — e.g. Full-stack Developer" aria-label="Headline" />
                </>
              ) : (
                <>
                  <h2 className="tp-name">{user.fullName}</h2>
                  {headline && <p className="tp-headline">{headline}</p>}
                </>
              )}
            </div>

            <div className="tp-header__actions">
              {editing ? (
                <>
                  <button type="button" className="tp-cancel" onClick={cancel} disabled={saving}>Cancel</button>
                  <button type="button" className="tp-edit" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                </>
              ) : (
                <>
                  <a className="tp-cancel" href={`/talent/${user.id}`} target="_blank" rel="noreferrer">Share profile ↗</a>
                  <button type="button" className="tp-edit" onClick={startEdit}>✎ Edit profile</button>
                </>
              )}
            </div>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}

          <div className="tp-meta">
            <span>{user.email}</span>
            {editing ? (
              <>
                <input className="tp-input tp-input--inline" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone" aria-label="Phone" />
                <input className="tp-input tp-input--inline" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Location" aria-label="Location" />
              </>
            ) : (
              <>
                {user.phone && <span>{user.phone}</span>}
                {user.location && <span>{user.location}</span>}
              </>
            )}
          </div>

          {editing ? (
            <label className="tp-check">
              <input
                type="checkbox"
                checked={form.availableForFreelance}
                onChange={(e) => set("availableForFreelance", e.target.checked)}
              />
              <span>Open to freelance &amp; contract work</span>
            </label>
          ) : (
            <div className="tp-pills">
              {user.availableForFreelance && <span className="tp-pill tp-pill--green">Open to freelance &amp; contract work</span>}
              <span className="tp-pill tp-pill--blue">Job seeker</span>
            </div>
          )}

          <div className="tp-completion">
            <div className="tp-completion__head">
              <span>Profile completeness</span>
              <span>{completion ? `${completion.percent}%` : "…"}</span>
            </div>
            <div className="completion-meter" role="progressbar" aria-valuenow={completion?.percent ?? 0} aria-valuemin={0} aria-valuemax={100}>
              <div className="completion-meter__fill" style={{ width: `${completion?.percent ?? 0}%` }} />
            </div>
            <p className="tp-completion__hint">Add more details to reach 100% and rank higher with employers.</p>
          </div>
        </div>
      </section>

      <div className="tp-body">
        {/* Main column */}
        <div className="tp-body__main">
          {/* About */}
          <section className="tp-card">
            <h3 className="tp-section-title">About</h3>
            {editing ? (
              <textarea className="tp-textarea" value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Write a short bio so employers get to know you." rows={4} />
            ) : user.bio ? (
              <p className="tp-about">{user.bio}</p>
            ) : (
              <p className="dash-muted">No bio yet. Click <strong>Edit profile</strong> to add one.</p>
            )}
          </section>

          {/* Experience */}
          <section className="tp-card">
            <h3 className="tp-section-title">Experience</h3>
            {editing ? (
              <div className="tp-edit-list">
                {form.experiences.map((exp, i) => (
                  <div className="tp-edit-item" key={i}>
                    <div className="tp-edit-item__head">
                      <span className="tp-edit-item__label">Experience {i + 1}</span>
                      <button type="button" className="tp-item-remove" onClick={() => removeItem("experiences", i)}>Remove</button>
                    </div>
                    <input className="tp-input" value={exp.title} onChange={(e) => updateItem("experiences", i, "title", e.target.value)} placeholder="Role / title" />
                    <div className="tp-field-row">
                      <input className="tp-input" value={exp.organization} onChange={(e) => updateItem("experiences", i, "organization", e.target.value)} placeholder="Organization" />
                      <input className="tp-input" value={exp.period} onChange={(e) => updateItem("experiences", i, "period", e.target.value)} placeholder="Period — e.g. 2022–2024" />
                    </div>
                    <textarea className="tp-textarea" value={exp.description} onChange={(e) => updateItem("experiences", i, "description", e.target.value)} placeholder="What you did" rows={2} />
                  </div>
                ))}
                <button type="button" className="tp-btn-add" onClick={() => addItem("experiences", emptyExperience)}>+ Add experience</button>
              </div>
            ) : experiences.length ? (
              <ul className="tp-list">
                {experiences.map((exp, i) => (
                  <li className="tp-entry" key={i}>
                    <div className="tp-entry__avatar">{(exp.organization || exp.title || "?").trim().charAt(0).toUpperCase()}</div>
                    <div className="tp-entry__body">
                      <p className="tp-entry__title">{exp.title}</p>
                      {(exp.organization || exp.period) && (
                        <p className="tp-entry__meta">{[exp.organization, exp.period].filter(Boolean).join(" · ")}</p>
                      )}
                      {exp.description && <p className="tp-entry__desc">{exp.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dash-muted">No experience added yet. Your work history will appear here.</p>
            )}
          </section>

          {/* Project portfolio */}
          <section className="tp-card">
            <h3 className="tp-section-title">Project portfolio</h3>
            {editing ? (
              <div className="tp-edit-list">
                {form.projects.map((proj, i) => (
                  <div className="tp-edit-item" key={i}>
                    <div className="tp-edit-item__head">
                      <span className="tp-edit-item__label">Project {i + 1}</span>
                      <button type="button" className="tp-item-remove" onClick={() => removeItem("projects", i)}>Remove</button>
                    </div>
                    <input className="tp-input" value={proj.name} onChange={(e) => updateItem("projects", i, "name", e.target.value)} placeholder="Project name" />
                    <input className="tp-input" value={proj.link} onChange={(e) => updateItem("projects", i, "link", e.target.value)} placeholder="Link (optional)" />
                    <textarea className="tp-textarea" value={proj.description} onChange={(e) => updateItem("projects", i, "description", e.target.value)} placeholder="What it is / your role" rows={2} />
                  </div>
                ))}
                <button type="button" className="tp-btn-add" onClick={() => addItem("projects", emptyProject)}>+ Add project</button>
              </div>
            ) : projects.length ? (
              <ul className="tp-list">
                {projects.map((proj, i) => (
                  <li className="tp-entry" key={i}>
                    <div className="tp-entry__avatar">{(proj.name || "?").trim().charAt(0).toUpperCase()}</div>
                    <div className="tp-entry__body">
                      <p className="tp-entry__title">{proj.name}</p>
                      {proj.link && (
                        <p className="tp-entry__meta"><a href={proj.link} target="_blank" rel="noreferrer">{proj.link}</a></p>
                      )}
                      {proj.description && <p className="tp-entry__desc">{proj.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dash-muted">No projects added yet. Showcase your best work here.</p>
            )}
          </section>
        </div>

        {/* Side column */}
        <aside className="tp-body__side">
          {/* Skills */}
          <section className="tp-card">
            <h3 className="tp-section-title">Skills</h3>
            {editing ? (
              <div className="skills-input">
                {form.skills.map((s) => (
                  <span className="skill-chip" key={s}>
                    {s}
                    <button type="button" aria-label={`Remove ${s}`} onClick={() => set("skills", form.skills.filter((x) => x !== s))}>×</button>
                  </span>
                ))}
                <input
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={handleSkillKey}
                  onBlur={() => addSkill(skillDraft)}
                  placeholder={form.skills.length ? "Add another…" : "e.g. JavaScript"}
                  aria-label="Add a skill"
                />
              </div>
            ) : skills.length ? (
              <ul className="tp-skills">
                {skills.map((s) => <li className="tp-skill" key={s}>{s}</li>)}
              </ul>
            ) : (
              <p className="dash-muted">No skills added yet.</p>
            )}
          </section>

          {/* Documents */}
          <section className="tp-card">
            <div className="tp-card__head">
              <h3 className="tp-section-title">Documents</h3>
              <button
                type="button"
                className="link-btn"
                onClick={() => resumeInputRef.current?.click()}
                disabled={resumeUploading}
              >
                {resumeUploading ? "Uploading…" : user.resumeUrl ? "Replace" : "Upload"}
              </button>
            </div>
            {user.resumeUrl ? (
              <a className="tp-doc" href={user.resumeUrl} target="_blank" rel="noreferrer">
                <span className="tp-doc__icon"><Icons.file /></span>
                <span className="tp-doc__name">Resume / CV</span>
                <span className="tp-doc__check" aria-label="Uploaded"><Icons.check /></span>
              </a>
            ) : (
              <p className="dash-muted">No resume uploaded yet. Employers see this when you apply.</p>
            )}
            {resumeError && <p className="job-card__error" role="alert">{resumeError}</p>}
            {avatarError && <p className="job-card__error" role="alert">{avatarError}</p>}
            <input
              ref={resumeInputRef}
              type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeChange}
              hidden
            />
          </section>

          {/* Certificates & other documents */}
          <section className="tp-card">
            <div className="tp-card__head">
              <h3 className="tp-section-title">Certificates</h3>
              <button type="button" className="link-btn" onClick={() => certInputRef.current?.click()} disabled={certUploading}>
                {certUploading ? "Uploading…" : "Add"}
              </button>
            </div>
            {certs.length ? (
              <ul className="cert-list">
                {certs.map((c) => (
                  <li className="cert-item" key={c.id}>
                    <span className="tp-doc__icon"><Icons.file /></span>
                    <a className="cert-item__name" href={c.url} target="_blank" rel="noreferrer">{c.name}</a>
                    <button type="button" className="link-btn link-btn--danger" onClick={() => removeCert(c.id)}>Remove</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dash-muted">Add certificates, references, or portfolio files (PDF, Word, or image).</p>
            )}
            {certError && <p className="job-card__error" role="alert">{certError}</p>}
            <input
              ref={certInputRef}
              type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
              onChange={handleCertChange}
              hidden
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

function buildForm(user) {
  return {
    fullName: user.fullName || "",
    headline: user.headline || "",
    location: user.location || "",
    phone: user.phone || "",
    bio: user.bio || "",
    availableForFreelance: Boolean(user.availableForFreelance),
    skills: user.skills || [],
    experiences: Array.isArray(user.experiences) ? user.experiences.map((e) => ({ ...emptyExperience(), ...e })) : [],
    projects: Array.isArray(user.projects) ? user.projects.map((p) => ({ ...emptyProject(), ...p })) : [],
  };
}
