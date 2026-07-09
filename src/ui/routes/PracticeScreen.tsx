import { useNavigate } from "react-router-dom";
import { listExercises } from "@/lessons/exercises";
import "./PracticeScreen.css";

export function PracticeScreen() {
  const navigate = useNavigate();
  const exercises = listExercises();

  return (
    <div className="practice">
      <h2 className="practice__heading">Practice ⭐</h2>
      <p className="practice__intro">
        Warm up your fingers! Each exercise plays just like a song — listen
        first, then play along.
      </p>

      <ul className="practice__grid">
        {exercises.map((ex) => (
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
    </div>
  );
}
