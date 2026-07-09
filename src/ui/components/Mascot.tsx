import "./Mascot.css";

interface MascotProps {
  /** Mood changes the face a little. */
  mood?: "happy" | "cheer" | "wave";
  size?: number;
}

/**
 * "Keys" the friendly mascot — a simple inline SVG so it's crisp at any size,
 * themeable, and costs no network request. Delivers praise and greetings across
 * the app (Home, lessons, report card) to keep the tone warm for young players.
 */
export function Mascot({ mood = "happy", size = 120 }: MascotProps) {
  return (
    <svg
      className={`mascot mascot--${mood}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Keys the piano friend"
    >
      <ellipse cx="60" cy="108" rx="30" ry="6" className="mascot__shadow" />
      <g className="mascot__body">
        <rect x="24" y="30" width="72" height="66" rx="20" className="mascot__face" />
        {/* piano-key teeth for a musical smile */}
        <rect x="40" y="70" width="40" height="16" rx="4" fill="#fff" />
        <g fill="#1f2440">
          <rect x="48" y="70" width="3" height="16" />
          <rect x="56" y="70" width="3" height="16" />
          <rect x="64" y="70" width="3" height="16" />
          <rect x="72" y="70" width="3" height="16" />
        </g>
        {/* eyes */}
        <circle cx="47" cy="54" r="7" fill="#fff" />
        <circle cx="73" cy="54" r="7" fill="#fff" />
        <circle cx="47" cy="55" r="3.5" fill="#1f2440" className="mascot__pupil" />
        <circle cx="73" cy="55" r="3.5" fill="#1f2440" className="mascot__pupil" />
        {/* little music-note antenna */}
        <line x1="60" y1="30" x2="60" y2="16" className="mascot__antenna" />
        <circle cx="58" cy="14" r="5" fill="var(--c-pink)" />
      </g>
    </svg>
  );
}
