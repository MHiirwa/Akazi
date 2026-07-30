import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { landingPathForRole } from "../constants/roles";
import GoogleMark from "./GoogleMark";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Real button: only mounted when a Client ID exists (so the useGoogleLogin
// hook always runs inside <GoogleOAuthProvider>). Keeps the custom .sso-btn
// styling; the picked `role` is sent to the backend for brand-new users only.
function EnabledButton({ role, label }) {
  const { googleAuth } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = useGoogleLogin({
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      setBusy(true);
      setError("");
      try {
        const user = await googleAuth({ accessToken: tokenResponse.access_token, role });
        navigate(landingPathForRole(user.role));
      } catch (err) {
        setError(err.message || "Google sign-in failed. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    onError: () => setError("Google sign-in was cancelled or failed."),
  });

  return (
    <>
      <button
        type="button"
        className="sso-btn"
        onClick={() => start()}
        disabled={busy}
        aria-busy={busy}
      >
        <GoogleMark /> {busy ? "Signing in…" : label}
      </button>
      {error && <p className="form-note" role="alert">{error}</p>}
    </>
  );
}

// Fallback shown until VITE_GOOGLE_CLIENT_ID is set — same look, no crash.
function DisabledButton({ label }) {
  const [note, setNote] = useState("");
  return (
    <>
      <button
        type="button"
        className="sso-btn"
        onClick={() => setNote("Google sign-in isn’t configured yet — add your Client ID to enable it.")}
      >
        <GoogleMark /> {label}
      </button>
      {note && <p className="form-note" role="status">{note}</p>}
    </>
  );
}

export default function GoogleAuthButton({ role, label = "Continue with Google" }) {
  return CLIENT_ID ? <EnabledButton role={role} label={label} /> : <DisabledButton label={label} />;
}
