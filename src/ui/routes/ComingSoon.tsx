import { Link } from "react-router-dom";
import "./ComingSoon.css";

interface ComingSoonProps {
  emoji: string;
  title: string;
  note: string;
}

/** Placeholder for screens still under construction. */
export function ComingSoon({ emoji, title, note }: ComingSoonProps) {
  return (
    <div className="coming-soon">
      <span className="coming-soon__emoji" aria-hidden="true">{emoji}</span>
      <h2>{title}</h2>
      <p>{note}</p>
      <Link to="/" className="coming-soon__back">← Back home</Link>
    </div>
  );
}
