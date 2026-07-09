import { useState } from "react";
import { LESSONS, type Lesson } from "@/lessons/lessons";
import { LessonRunner } from "@/ui/components/LessonRunner";
import "./LearnScreen.css";

export function LearnScreen() {
  const [active, setActive] = useState<Lesson | null>(null);
  const [finishedId, setFinishedId] = useState<string | null>(null);

  if (active) {
    return (
      <div className="learn">
        <button className="learn__back" onClick={() => setActive(null)}>
          ← All lessons
        </button>
        <h2 className="learn__title">{active.title}</h2>
        <LessonRunner
          key={active.id}
          lesson={active}
          onFinish={() => {
            setFinishedId(active.id);
            setActive(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="learn">
      <h2 className="learn__heading">Learn 🌱</h2>
      <p className="learn__intro">Short lessons — one new idea at a time.</p>

      <ol className="learn__list">
        {LESSONS.map((lesson, i) => (
          <li key={lesson.id}>
            <button className="learn__card" onClick={() => setActive(lesson)}>
              <span className="learn__num">{i + 1}</span>
              <span className="learn__emoji" aria-hidden="true">{lesson.emoji}</span>
              <span className="learn__card-text">
                <span className="learn__card-title">{lesson.title}</span>
                <span className="learn__card-blurb">{lesson.blurb}</span>
              </span>
              {finishedId === lesson.id && (
                <span className="learn__done" aria-label="Completed">✓</span>
              )}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
