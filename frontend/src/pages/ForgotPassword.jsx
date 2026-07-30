import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import AuthVisual from "../components/AuthVisual";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
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
        {sent ? (
          <div className="auth-card">
            <div className="auth-card__title">Check your inbox</div>
            <div className="auth-card__subtitle">
              If an account exists for <strong>{email}</strong>, we've sent a link to reset your
              password. The link expires in 60 minutes.
            </div>
            <div className="auth-switch">
              <Link to="/login">Back to log in</Link>
            </div>
          </div>
        ) : (
          <form className="auth-card" onSubmit={handleSubmit}>
            <div className="auth-card__title">Forgot your password?</div>
            <div className="auth-card__subtitle">
              Enter your email and we'll send you a link to reset it.
            </div>

            {error && (
              <div className="form-error" id="forgot-error" role="alert">
                {error}
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <button className="btn-primary" type="submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? "Sending…" : "Send reset link"}
            </button>

            <div className="auth-switch">
              Remembered it? <Link to="/login">Back to log in</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
