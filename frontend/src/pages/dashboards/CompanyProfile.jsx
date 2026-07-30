import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Panel } from "../../components/DashWidgets";

// Employer company profile editor — controls how the employer appears on their
// public page (/employers/:id): logo, name, tagline, about, location, website.
export default function CompanyProfile() {
  const { user, updateProfile, uploadAvatar } = useAuth();

  const [form, setForm] = useState({
    fullName: user.fullName || "",
    headline: user.headline || "",
    bio: user.bio || "",
    location: user.location || "",
    website: user.website || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const logoRef = useRef(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");

  const initial = (user.fullName || "?").trim().charAt(0).toUpperCase();
  const set = (field) => (e) => { setForm((f) => ({ ...f, [field]: e.target.value })); setSaved(false); };

  async function handleLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError("");
    setLogoUploading(true);
    try {
      await uploadAvatar(file);
    } catch (err) {
      setLogoError(err.message);
    } finally {
      setLogoUploading(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      await updateProfile({
        fullName: form.fullName.trim(),
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        website: form.website.trim(),
      });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Company profile">
      <p className="dash-muted company-profile__intro">
        This is how candidates see you on your <Link to={`/employers/${user.id}`}>public profile</Link>.
      </p>

      <form className="post-job-card post-job-card--flush" onSubmit={save}>
        {error && <div className="form-error" role="alert">{error}</div>}
        {saved && <div className="form-success" role="status">Company profile saved.</div>}

        <div className="avatar-field">
          <div className="avatar-preview">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="Company logo" /> : <span>{initial}</span>}
          </div>
          <div className="avatar-field__body">
            <span className="field-label">Company logo</span>
            <div className="avatar-field__actions">
              <button type="button" className="btn-secondary btn-sm" onClick={() => logoRef.current?.click()} disabled={logoUploading}>
                {logoUploading ? "Uploading…" : user.avatarUrl ? "Change logo" : "Upload logo"}
              </button>
              <span className="field-hint">JPG, PNG, WEBP or GIF · max 5MB</span>
            </div>
            {logoError && <p className="avatar-field__error" role="alert">{logoError}</p>}
            <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleLogo} hidden />
          </div>
        </div>

        <div className="field">
          <label htmlFor="companyName">Company name</label>
          <input id="companyName" required minLength={2} value={form.fullName} onChange={set("fullName")} placeholder="Acme Inc." />
        </div>
        <div className="field">
          <label htmlFor="tagline">Tagline</label>
          <input id="tagline" value={form.headline} onChange={set("headline")} placeholder="Building sustainable technology" />
        </div>
        <div className="field">
          <label htmlFor="about">About</label>
          <textarea id="about" rows={4} value={form.bio} onChange={set("bio")} placeholder="Tell candidates what your company does." />
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="loc">Location</label>
            <input id="loc" value={form.location} onChange={set("location")} placeholder="Kigali, Rwanda" />
          </div>
          <div className="field">
            <label htmlFor="website">Website</label>
            <input id="website" value={form.website} onChange={set("website")} placeholder="https://example.com" />
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </Panel>
  );
}
