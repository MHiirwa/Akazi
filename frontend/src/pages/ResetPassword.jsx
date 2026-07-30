import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import AuthVisual from "../components/AuthVisual";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await api.resetPassword(token, form.password);
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthVisual />

      <div className="auth-shell__form-side">
        {!token ? (
          <div className="auth-card">
            <div className="auth-card__title">Invalid reset link</div>
            <div className="auth-card__subtitle">
              This link is missing its reset token. Please request a new one.
            </div>
            <div className="auth-switch">
              <Link to="/forgot-password">Request a new link</Link>
            </div>
          </div>
        ) : done ? (
          <div className="auth-card">
            <div className="auth-card__title">Password reset ✓</div>
            <div className="auth-card__subtitle">
              Your password has been updated. Redirecting you to log in…
            </div>
            <div className="auth-switch">
              <Link to="/login">Go to log in now</Link>
            </div>
          </div>
        ) : (
          <form className="auth-card" onSubmit={handleSubmit}>
            <div className="auth-card__title">Choose a new password</div>
            <div className="auth-card__subtitle">Enter and confirm your new password.</div>

            {error && (
              <div className="form-error" id="reset-error" role="alert">
                {error}
              </div>
            )}

            <div className="field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={update("password")}
                placeholder="At least 8 characters"
              />
            </div>

            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                value={form.confirm}
                onChange={update("confirm")}
                placeholder="Re-enter your password"
              />
            </div>

            <button className="btn-primary" type="submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? "Resetting…" : "Reset password"}
            </button>

            <div className="auth-switch">
              <Link to="/login">Back to log in</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
