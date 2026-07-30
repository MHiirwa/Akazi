const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// A single handler the app registers (see AuthContext) so the client can tell
// the UI when the session is no longer valid — an expired/invalid token (401)
// or an account suspended mid-session (403). The handler tears down the session
// and redirects to login; here we just fire it, then let the caller's catch()
// run as usual.
let authErrorHandler = null;
export function setAuthErrorHandler(fn) {
  authErrorHandler = fn;
}

// Decide whether a failed response means "your session ended". A 401 always
// does. A 403 only does when it's the suspension response (other 403s are
// ordinary "you can't do that" permission errors we must NOT log out on).
function isSessionEnding(status, data) {
  if (status === 401) return true;
  if (status === 403 && /suspend/i.test(data?.error || "")) return true;
  return false;
}

// Thin wrapper around fetch: builds the URL, attaches JSON headers and the
// bearer token if one is stored, and throws a normal Error with the
// server's message so components can catch() it directly.
async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (isSessionEnding(res.status, data)) authErrorHandler?.(data.error || "");
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

// Separate helper for file uploads: sends FormData (multipart/form-data). We
// must NOT set Content-Type ourselves — the browser adds it with the correct
// multipart boundary.
async function upload(path, formData, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isSessionEnding(res.status, data)) authErrorHandler?.(data.error || "");
    throw new Error(data.error || "Upload failed");
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  googleAuth: (payload) => request("/auth/google", { method: "POST", body: payload }),
  me: (token) => request("/auth/me", { token }),
  updateProfile: (payload, token) => request("/auth/me", { method: "PATCH", body: payload, token }),
  uploadAvatar: (file, token) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return upload("/auth/me/avatar", fd, token);
  },
  uploadResume: (file, token) => {
    const fd = new FormData();
    fd.append("resume", file);
    return upload("/auth/me/resume", fd, token);
  },
  profileCompletion: (token) => request("/auth/me/completion", { token }),
  forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token, password) =>
    request("/auth/reset-password", { method: "POST", body: { token, password } }),

  // Jobs — employer views + public search
  jobs: {
    search: (params = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null && v !== "")
      ).toString();
      return request(`/jobs${qs ? `?${qs}` : ""}`);
    },
    get: (id) => request(`/jobs/${id}`),
    stats: () => request("/jobs/stats"),
    mine: (token) => request("/jobs/mine/list", { token }),
    applicantCounts: (token) => request("/jobs/mine/applicant-counts", { token }),
    analytics: (token) => request("/jobs/mine/analytics", { token }),
    create: (body, token) => request("/jobs", { method: "POST", body, token }),
    update: (id, body, token) => request(`/jobs/${id}`, { method: "PATCH", body, token }),
    remove: (id, token) => request(`/jobs/${id}`, { method: "DELETE", token }),
  },

  // Applications — employer review + job seeker history
  applications: {
    forJob: (jobId, token) => request(`/applications/job/${jobId}`, { token }),
    forEmployer: (token) => request("/applications/employer", { token }),
    mine: (token) => request("/applications/mine", { token }),
    apply: (jobId, coverLetter, token) =>
      request("/applications", { method: "POST", body: { jobId, coverLetter }, token }),
    withdraw: (id, token) => request(`/applications/${id}/withdraw`, { method: "PATCH", token }),
    setStatus: (id, status, token, reason) =>
      request(`/applications/${id}/status`, { method: "PATCH", body: reason ? { status, reason } : { status }, token }),
    review: (id, body, token) =>
      request(`/applications/${id}/review`, { method: "PATCH", body, token }),
    scheduleInterview: (id, body, token) =>
      request(`/applications/${id}/interview`, { method: "PATCH", body, token }),
  },

  // Saved / bookmarked jobs (job seeker).
  savedJobs: {
    list: (token) => request("/saved-jobs", { token }),
    save: (jobId, token) => request("/saved-jobs", { method: "POST", body: { jobId }, token }),
    remove: (jobId, token) => request(`/saved-jobs/${jobId}`, { method: "DELETE", token }),
  },

  // Extra documents / certificates (job seeker).
  documents: {
    list: (token) => request("/documents", { token }),
    upload: (file, name, token) => {
      const fd = new FormData();
      fd.append("document", file);
      if (name) fd.append("name", name);
      return upload("/documents", fd, token);
    },
    remove: (id, token) => request(`/documents/${id}`, { method: "DELETE", token }),
  },

  // Public shareable seeker profile.
  talentProfile: (id) => request(`/users/talent/${id}`),

  // Talent pool — employers browse job-seeker profiles.
  talent: {
    search: (params = {}, token) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null && v !== "")
      ).toString();
      return request(`/users/talent${qs ? `?${qs}` : ""}`, { token });
    },
  },

  // In-app notifications.
  notifications: {
    list: (token) => request("/notifications", { token }),
    markRead: (id, token) => request(`/notifications/${id}/read`, { method: "PATCH", token }),
    markAllRead: (token) => request("/notifications/read-all", { method: "PATCH", token }),
  },

  // Job alerts — public email subscription + unsubscribe
  jobAlerts: {
    subscribe: (payload) => request("/job-alerts", { method: "POST", body: payload }),
    unsubscribe: (token) => request("/job-alerts/unsubscribe", { method: "POST", body: { token } }),
    mine: (token) => request("/job-alerts/mine", { token }),
    saveMine: (payload, token) => request("/job-alerts/mine", { method: "POST", body: payload, token }),
    deleteMine: (token) => request("/job-alerts/mine", { method: "DELETE", token }),
  },

  // Employer reviews — public listing + shortlisted-seeker create + delete
  reviews: {
    forEmployer: (employerId, { page = 1, limit = 10 } = {}) =>
      request(`/employers/${employerId}/reviews?page=${page}&limit=${limit}`),
    create: (employerId, body, token) =>
      request(`/employers/${employerId}/reviews`, { method: "POST", body, token }),
    remove: (id, token) => request(`/reviews/${id}`, { method: "DELETE", token }),
  },

  // Admin — user management + job moderation
  admin: {
    listUsers: (token, params = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null && v !== "")
      ).toString();
      return request(`/admin/users${qs ? `?${qs}` : ""}`, { token });
    },
    userStats: (token) => request("/users/stats", { token }),
    setSuspended: (id, suspended, token) =>
      request(`/admin/users/${id}/suspend`, { method: "PATCH", body: { suspended }, token }),
    setEmployerStatus: (id, status, token) =>
      request(`/admin/users/${id}/employer-status`, { method: "PATCH", body: { status }, token }),
    listJobs: (token, params = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null && v !== "")
      ).toString();
      return request(`/admin/jobs${qs ? `?${qs}` : ""}`, { token });
    },
    removeJob: (id, token) => request(`/admin/jobs/${id}/remove`, { method: "PATCH", token }),
    restoreJob: (id, token) => request(`/admin/jobs/${id}/restore`, { method: "PATCH", token }),
  },
};
