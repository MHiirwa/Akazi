import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { landingPathForRole } from "../constants/roles";
import AuthVisual from "../components/AuthVisual";
import GoogleAuthButton from "../components/GoogleAuthButton";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Set when the app redirected here because the session ended (expiry/suspend).
  const [notice, setNotice] = useState(location.state?.sessionEnded || "");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const user = await login({ email: form.email, password: form.password });
      navigate(landingPathForRole(user.role));
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
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-card__title">Welcome back</div>
          <div className="auth-card__subtitle">Log in to continue to Akazi.</div>

          {notice && !error && (
            <div className="form-notice" role="status">
              {notice}
            </div>
          )}

          {error && (
            <div className="form-error" id="login-error" role="alert">
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
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              value={form.email}
              onChange={update("email")}
              placeholder="you@example.com"
            />
          </div>

          <div className="field">
            <div className="field-label-row">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="field-link">Forgot password?</Link>
            </div>
            <PasswordInput
              id="password"
              required
              autoComplete="current-password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              value={form.password}
              onChange={update("password")}
              placeholder="••••••••"
            />
          </div>

          <button className="btn-primary" type="submit" disabled={submitting} aria-busy={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </button>

          <div className="auth-divider">or</div>

          <GoogleAuthButton label="Continue with Google" />

          <div className="auth-switch">
            New to Akazi? <Link to="/register">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
