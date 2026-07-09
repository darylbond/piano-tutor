import { useEffect, useMemo, useRef, useState } from "react";
import type { Lesson } from "@/lessons/lessons";
import { WaitModeMatcher } from "@/engine/matcher";
import type { ScoreNote } from "@/engine/types";
import { MidiNoteInput } from "@/audio/midi";
import { Synth } from "@/engine/synth";
import { KeyboardView } from "./KeyboardView";
import { BigButton } from "./BigButton";
import "./LessonRunner.css";

interface LessonRunnerProps {
  lesson: Lesson;
  onFinish: () => void;
}

function toScoreNotes(midis: number[]): ScoreNote[] {
  return midis.map((midi, id) => ({
    id,
    midi,
    startBeat: id,
    durBeats: 1,
    hand: "right",
    measure: 1,
  }));
}

export function LessonRunner({ lesson, onFinish }: LessonRunnerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stepComplete, setStepComplete] = useState(false);
  const [correct, setCorrect] = useState<Set<number>>(new Set());
  const [, forceRender] = useState(0);

  const synthRef = useRef(new Synth());
  const matcherRef = useRef<WaitModeMatcher | null>(null);
  const step = lesson.steps[stepIndex];

  // Reset per-step interactive state whenever the step changes.
  useEffect(() => {
    setStepComplete(false);
    setCorrect(new Set());
    if (step?.kind === "play") {
      matcherRef.current = new WaitModeMatcher(toScoreNotes(step.midis), {
        octaveForgiving: false,
      });
    } else {
      matcherRef.current = null;
    }
  }, [stepIndex, step]);

  // The keys we currently want the child to press.
  const targets = useMemo(() => {
    if (!step || stepComplete) return new Set<number>();
    if (step.kind === "find") return new Set([step.midi]);
    if (step.kind === "chord") return new Set(step.midis.filter((m) => !correct.has(m)));
    if (step.kind === "play") {
      const m = matcherRef.current;
      return new Set(m ? m.currentStep().map((n) => n.midi) : []);
    }
    return new Set<number>();
  }, [step, stepComplete, correct]);

  const handlePressRef = useRef<(midi: number) => void>(() => {});
  handlePressRef.current = (midi: number) => {
    if (!step || stepComplete) return;
    synthRef.current.playNote(midi, 350);

    if (step.kind === "find") {
      if (midi === step.midi) {
        setCorrect(new Set([midi]));
        setStepComplete(true);
      }
    } else if (step.kind === "chord") {
      if (step.midis.includes(midi)) {
        setCorrect((prev) => {
          const next = new Set(prev).add(midi);
          if (step.midis.every((m) => next.has(m))) setStepComplete(true);
          return next;
        });
      }
    } else if (step.kind === "play") {
      const m = matcherRef.current;
      if (!m) return;
      const advanced = m.handleEvent({ midi, timeMs: performance.now(), source: "keyboard" });
      if (advanced) {
        setCorrect((prev) => new Set(prev).add(midi));
        forceRender((n) => n + 1); // targets depend on matcher-internal state
        if (m.isComplete()) setStepComplete(true);
      }
    }
  };

  // MIDI piano can drive lessons too (no permission needed).
  useEffect(() => {
    if (!MidiNoteInput.isSupported()) return;
    const midi = new MidiNoteInput();
    let unsub: (() => void) | undefined;
    midi
      .listen()
      .then(() => {
        unsub = midi.subscribe((e) => handlePressRef.current(e.midi));
      })
      .catch(() => {});
    return () => {
      unsub?.();
      midi.dispose();
    };
  }, []);

  if (!step) return null;

  const isLast = stepIndex === lesson.steps.length - 1;

  function next() {
    if (isLast) onFinish();
    else setStepIndex((i) => i + 1);
  }

  const interactive = step.kind !== "say";
  const message = stepComplete && interactive ? step.done : step.text;

  return (
    <div className="lesson">
      <div className="lesson__progress">
        {lesson.steps.map((_, i) => (
          <span
            key={i}
            className={`lesson__dot ${i <= stepIndex ? "on" : ""}`}
          />
        ))}
      </div>

      <div className="lesson__bubble">
        {step.kind === "say" && (
          <span className="lesson__emoji" aria-hidden="true">{step.emoji}</span>
        )}
        <p className="lesson__text">{message}</p>
      </div>

      {interactive && (
        <KeyboardView
          lowMidi={lesson.lowMidi}
          highMidi={lesson.highMidi}
          highlight={targets}
          correct={correct}
          onPress={(m) => handlePressRef.current(m)}
        />
      )}

      <div className="lesson__actions">
        {step.kind === "say" && (
          <BigButton variant="primary" size="lg" onClick={next}>
            Next →
          </BigButton>
        )}
        {interactive && stepComplete && (
          <BigButton variant="primary" size="lg" onClick={next}>
            {isLast ? "Finish 🎉" : "Next →"}
          </BigButton>
        )}
      </div>
    </div>
  );
}
