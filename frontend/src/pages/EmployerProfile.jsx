import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { StarRatingDisplay, StarRatingInput } from "../components/StarRating";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function EmployerProfile() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const canReview = user && user.role === "JOB_SEEKER";
  const isAdmin = user?.role === "ADMIN";

  const [employer, setEmployer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, averageRating: null });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Review form
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formOk, setFormOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.reviews.forEmployer(id, { page, limit: 10 });
      setEmployer(data.employer);
      setReviews(data.data);
      setMeta(data.meta);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    load();
  }, [load]);

  const alreadyReviewed = user && reviews.some((r) => r.author?.id === user.id);

  async function submitReview(e) {
    e.preventDefault();
    setFormError("");
    setFormOk(false);
    if (!rating) {
      setFormError("Please pick a star rating.");
      return;
    }
    setSubmitting(true);
    try {
      await api.reviews.create(id, { rating, comment: comment.trim() }, token);
      setRating(0);
      setComment("");
      setFormOk(true);
      setPage(1);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeReview(reviewId) {
    if (!window.confirm("Delete this review?")) return;
    try {
      await api.reviews.remove(reviewId, token);
      await load();
    } catch (err) {
      setLoadError(err.message);
    }
  }

  const totalPages = Math.max(1, meta.totalPages || 1);
  const name = employer?.fullName || "Employer";
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div className="page page--wide">
      <SiteHeader />

      <main className="jobd-page">
        <Link to="/jobs" className="jobd-back">← Back to all jobs</Link>

        {loading ? (
          <p className="dash-muted">Loading…</p>
        ) : loadError ? (
          <div className="jobs-empty">{loadError}</div>
        ) : (
          <>
            <header className="emp-profile-head">
              <div className="emp-profile-avatar">
                {employer?.avatarUrl ? <img src={employer.avatarUrl} alt={name} /> : <span>{initial}</span>}
              </div>
              <div>
                <h1 className="emp-profile-name">{name}</h1>
                <div className="emp-profile-rating">
                  {meta.averageRating != null ? (
                    <StarRatingDisplay value={meta.averageRating} count={meta.total} size="1.15rem" />
                  ) : (
                    <span className="dash-muted">No reviews yet</span>
                  )}
                </div>
              </div>
            </header>

            {/* Review form for eligible seekers (backend enforces the shortlist gate). */}
            {canReview && !alreadyReviewed && (
              <section className="panel review-form-panel">
                <h2 className="panel__title">Write a review</h2>
                <p className="dash-muted review-form-hint">
                  You can review an employer after being accepted (shortlisted) for one of their jobs.
                </p>
                <form onSubmit={submitReview}>
                  {formError && <div className="form-error" role="alert">{formError}</div>}
                  {formOk && <div className="form-success" role="status">Thanks — your review has been posted.</div>}
                  <div className="field">
                    <label>Your rating</label>
                    <StarRatingInput value={rating} onChange={setRating} />
                  </div>
                  <div className="field">
                    <label htmlFor="comment">Your review</label>
                    <textarea
                      id="comment"
                      rows={4}
                      required
                      maxLength={2000}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your experience working with this employer…"
                    />
                  </div>
                  <button className="btn-primary" type="submit" disabled={submitting}>
                    {submitting ? "Posting…" : "Post review"}
                  </button>
                </form>
              </section>
            )}

            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Reviews {meta.total ? `(${meta.total})` : ""}</h2>
              </div>
              {reviews.length === 0 ? (
                <p className="dash-muted">No reviews yet. Be the first to share your experience.</p>
              ) : (
                <ul className="review-list">
                  {reviews.map((r) => {
                    const canDelete = isAdmin || r.author?.id === user?.id;
                    const authorName = r.author?.fullName || "A reviewer";
                    return (
                      <li key={r.id} className="review-item">
                        <div className="review-item__avatar">
                          {r.author?.avatarUrl ? (
                            <img src={r.author.avatarUrl} alt={authorName} />
                          ) : (
                            <span>{authorName.trim().charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="review-item__body">
                          <div className="review-item__top">
                            <span className="review-item__author">{authorName}</span>
                            <StarRatingDisplay value={r.rating} size=".9rem" />
                            <span className="review-item__date dash-muted">{formatDate(r.createdAt)}</span>
                            {canDelete && (
                              <button className="link-btn link-btn--danger review-item__del" onClick={() => removeReview(r.id)}>
                                Delete
                              </button>
                            )}
                          </div>
                          <p className="review-item__comment">{r.comment}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {totalPages > 1 && (
                <nav className="pager" aria-label="Reviews pagination">
                  <button type="button" className="pager__btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
                  <span className="pager__status">Page {page} of {totalPages}</span>
                  <button type="button" className="pager__btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</button>
                </nav>
              )}
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
