import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setAuthErrorHandler } from "../api/client";

const AuthContext = createContext(null);

const TOKEN_KEY = "akazi_token";

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // Register a single global handler so ANY API call that comes back with an
  // expired/invalid token (401) or a mid-session suspension (403) tears down
  // the session and bounces the user to login with an explanatory message,
  // instead of leaving them stuck on a page showing a raw error string.
  useEffect(() => {
    setAuthErrorHandler((message) => {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      navigate("/login", {
        replace: true,
        state: { sessionEnded: message || "Your session has ended. Please sign in again." },
      });
    });
    return () => setAuthErrorHandler(null);
  }, [navigate]);

  // Restore a session on a fresh page load: if a token is stored but we don't
  // yet have a user, validate the token and load the user. We deliberately
  // SKIP this when `user` is already set (e.g. right after an explicit
  // login/register) — re-fetching there is redundant and, worse, a transient
  // failure of that call would wipe the session the user just created.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .me(token)
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, user]);

  function saveSession(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function register(payload) {
    const data = await api.register(payload);
    saveSession(data);
    return data.user;
  }

  async function login(payload) {
    const data = await api.login(payload);
    saveSession(data);
    return data.user;
  }

  // Google sign-in: exchange the Google access token (+ picked role) for our
  // own session. The backend keeps an existing user's role and never creates
  // a duplicate account, so `role` only applies to brand-new users.
  async function googleAuth(payload) {
    const data = await api.googleAuth(payload);
    saveSession(data);
    return data.user;
  }

  // FR 1.3 — Edit Profile. Persists the change, then updates the in-memory
  // user so the UI reflects it without a reload.
  async function updateProfile(payload) {
    const data = await api.updateProfile(payload, token);
    setUser(data.user);
    return data.user;
  }

  // Upload a profile picture; the returned user carries the new avatarUrl.
  async function uploadAvatar(file) {
    const data = await api.uploadAvatar(file, token);
    setUser(data.user);
    return data.user;
  }

  // Upload a resume/CV; the returned user carries the new resumeUrl.
  async function uploadResume(file) {
    const data = await api.uploadResume(file, token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, googleAuth, updateProfile, uploadAvatar, uploadResume, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
