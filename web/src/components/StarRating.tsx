// Star rating: read-only display, or interactive when onChange is provided.
export default function StarRating({
  value,
  onChange,
  size = 20,
  label,
}: {
  value: number | null;
  onChange?: (v: number) => void;
  size?: number;
  label?: string;
}) {
  const interactive = typeof onChange === 'function';
  return (
    <div className={`stars ${interactive ? 'stars-interactive' : ''}`} role={interactive ? 'radiogroup' : 'img'} aria-label={label || (value ? `Rated ${value} of 5` : 'Not rated')}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value != null && n <= value;
        const star = (
          <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
            fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
        return interactive ? (
          <button
            key={n}
            type="button"
            className={`star ${filled ? 'star-on' : ''}`}
            onClick={() => onChange!(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-checked={value === n}
            role="radio"
          >
            {star}
          </button>
        ) : (
          <span key={n} className={`star ${filled ? 'star-on' : ''}`}>{star}</span>
        );
      })}
    </div>
  );
}
