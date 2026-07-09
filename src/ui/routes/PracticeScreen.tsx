import { useNavigate } from "react-router-dom";
import { listExercises, type ExerciseMeta } from "@/lessons/exercises";
import "./PracticeScreen.css";

const GROUPS: { level: number; name: string }[] = [
  { level: 1, name: "Warm-Ups" },
  { level: 2, name: "Major Scales" },
  { level: 3, name: "Minor Scales & Arpeggios" },
  { level: 4, name: "Patterns" },
  { level: 5, name: "Advanced" },
];

export function PracticeScreen() {
  const navigate = useNavigate();
  const exercises = listExercises();
  const byLevel = (level: number): ExerciseMeta[] => exercises.filter((e) => e.level === level);

  return (
    <div className="practice">
      <h2 className="practice__heading">Practice ⭐</h2>
      <p className="practice__intro">
        Warm up your fingers! Each exercise plays just like a song — listen
        first, then play along. Work down the list as you get stronger.
      </p>

      {GROUPS.map((group) => {
        const items = byLevel(group.level);
        if (items.length === 0) return null;
        return (
          <section key={group.level} className="practice__section">
            <h3 className="practice__section-title">
              <span className="practice__section-badge">{"⭐".repeat(group.level)}</span>
              {group.name}
            </h3>
            <ul className="practice__grid">
              {items.map((ex) => (
                <li key={ex.id}>
                  <button
                    className="practice__card"
                    onClick={() => navigate(`/play/${ex.id}`)}
                  >
                    <span className="practice__emoji" aria-hidden="true">{ex.emoji}</span>
                    <span className="practice__title">{ex.title}</span>
                    <span className="practice__blurb">{ex.blurb}</span>
                    <span className="practice__go" aria-hidden="true">▶ Start</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
