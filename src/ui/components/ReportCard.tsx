import type { PlayResult } from "@/engine/scorer";
import { BigButton } from "./BigButton";
import { Mascot } from "./Mascot";
import "./ReportCard.css";

interface ReportCardProps {
  result: PlayResult;
  /** True if this run beat the child's previous best. */
  isNewBest: boolean;
  onPlayAgain: () => void;
  onPractice?: () => void;
  onBackToLibrary: () => void;
}

const PRAISE = [
  "Keep going — you're learning!",
  "Nice work! You're getting it.",
  "Great playing! So close to perfect.",
  "Amazing! You nailed it! ⭐",
];

export function ReportCard({
  result,
  isNewBest,
  onPlayAgain,
  onPractice,
  onBackToLibrary,
}: ReportCardProps) {
  const pct = Math.round(result.accuracy * 100);
  const praise = PRAISE[result.stars];

  return (
    <div className="report" role="dialog" aria-label="Your results">
      <Mascot mood={result.stars >= 2 ? "cheer" : "happy"} size={96} />
      <div className="report__stars" aria-label={`${result.stars} out of 3 stars`}>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`report__star ${i <= result.stars ? "report__star--on" : ""}`}
            style={{ animationDelay: `${i * 120}ms` }}
          >
            ★
          </span>
        ))}
      </div>

      <h2 className="report__praise">{praise}</h2>
      {isNewBest && result.stars > 0 && (
        <p className="report__best">🏅 New best!</p>
      )}

      <div className="report__stats">
        <div className="report__stat">
          <span className="report__stat-num">{pct}%</span>
          <span className="report__stat-label">right</span>
        </div>
        <div className="report__stat">
          <span className="report__stat-num">{result.hits}</span>
          <span className="report__stat-label">great</span>
        </div>
        {result.trickyMeasures.length > 0 && (
          <div className="report__stat">
            <span className="report__stat-num">{result.trickyMeasures.length}</span>
            <span className="report__stat-label">tricky bars</span>
          </div>
        )}
      </div>

      <div className="report__actions">
        <BigButton variant="primary" size="lg" icon="▶" onClick={onPlayAgain}>
          Play again
        </BigButton>
        {onPractice && result.trickyMeasures.length > 0 && (
          <BigButton variant="secondary" icon="🎯" onClick={onPractice}>
            Practice tricky bars
          </BigButton>
        )}
        <BigButton variant="ghost" icon="🏠" onClick={onBackToLibrary}>
          More songs
        </BigButton>
      </div>
    </div>
  );
}
