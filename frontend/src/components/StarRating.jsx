import { useState } from "react";

function Star({ filled, half }) {
  // A single star. `half` renders a 50%-filled star via a clip.
  const id = `half-${Math.random().toString(36).slice(2)}`;
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" className="star">
      {half && (
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 2.5z"
        fill={half ? `url(#${id})` : filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Read-only star display. `value` may be fractional (e.g. an average of 4.3).
export function StarRatingDisplay({ value = 0, count, size = "1rem" }) {
  const stars = [1, 2, 3, 4, 5].map((n) => {
    if (value >= n) return "full";
    if (value >= n - 0.5) return "half";
    return "empty";
  });
  return (
    <span className="stars" style={{ fontSize: size }} role="img" aria-label={`${value ? value.toFixed(1) : "No"} out of 5 stars`}>
      <span className="stars__row" aria-hidden="true">
        {stars.map((s, i) => (
          <Star key={i} filled={s === "full"} half={s === "half"} />
        ))}
      </span>
      {value ? <span className="stars__value">{value.toFixed(1)}</span> : null}
      {count != null && <span className="stars__count">({count})</span>}
    </span>
  );
}

// Interactive 1–5 star input for writing a review.
export function StarRatingInput({ value, onChange, size = "1.6rem" }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className="stars stars--input" style={{ fontSize: size }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="stars__btn"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          aria-pressed={value === n}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <Star filled={shown >= n} />
        </button>
      ))}
    </span>
  );
}
