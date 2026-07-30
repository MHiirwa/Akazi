import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { landingPathForRole } from "../constants/roles";
import AuthVisual from "../components/AuthVisual";
import GoogleAuthButton from "../components/GoogleAuthButton";
import PasswordInput from "../components/PasswordInput";

const ROLES = [
  { value: "JOB_SEEKER", label: "Job seeker" },
  { value: "EMPLOYER", label: "Employer" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    role: "JOB_SEEKER",
    availableForFreelance: false,
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await register({
        fullName: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.role === "JOB_SEEKER" && { availableForFreelance: form.availableForFreelance }),
      });
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
          <div className="auth-card__title">Create your account</div>

          {error && (
            <div className="form-error" id="register-error" role="alert">
              {error}
            </div>
          )}

          <div className="role-field">
            <span className="field-label" id="role-label">Choose</span>
            <div className="role-group" role="radiogroup" aria-labelledby="role-label">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={form.role === r.value}
                  className={`role-option ${form.role === r.value ? "is-selected" : ""}`}
                  onClick={() => setForm({ ...form, role: r.value })}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {form.role === "JOB_SEEKER" && (
            <label className="check-field">
              <input
                type="checkbox"
                checked={form.availableForFreelance}
                onChange={(e) => setForm({ ...form, availableForFreelance: e.target.checked })}
              />
              <span>I'm also open to freelance &amp; contract work</span>
            </label>
          )}

          <div className="auth-row">
            <div className="field">
              <label htmlFor="firstName">First name</label>
              <input id="firstName" required autoComplete="given-name" value={form.firstName} onChange={update("firstName")} placeholder="Maxime" />
            </div>
            <div className="field">
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" required autoComplete="family-name" value={form.lastName} onChange={update("lastName")} placeholder="Hirwa" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="phone">Phone number</label>
            <input id="phone" type="tel" required autoComplete="tel" value={form.phone} onChange={update("phone")} placeholder="0783766225" />
          </div>

          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "register-error" : undefined}
              value={form.email}
              onChange={update("email")}
              placeholder="you@example.com"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <PasswordInput
              id="password"
              required
              minLength={8}
              autoComplete="new-password"
              aria-describedby="password-hint"
              value={form.password}
              onChange={update("password")}
              placeholder="At least 8 characters"
            />
            <span id="password-hint" className="field-hint">Use at least 8 characters.</span>
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <PasswordInput
              id="confirmPassword"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
              placeholder="Re-enter your password"
            />
          </div>

          <button className="btn-primary" type="submit" disabled={submitting} aria-busy={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>

          <div className="auth-divider">or</div>

          <GoogleAuthButton role={form.role} label="Sign up with Google" />

          <div className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
