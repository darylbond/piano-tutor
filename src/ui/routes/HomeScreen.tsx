import { useNavigate } from "react-router-dom";
import { Mascot } from "@/ui/components/Mascot";
import { useProgress } from "@/store/progress";
import "./HomeScreen.css";

interface HomeCard {
  to: string;
  emoji: string;
  title: string;
  blurb: string;
  variant: "play" | "learn" | "practice";
}

const CARDS: HomeCard[] = [
  {
    to: "/library",
    emoji: "🎵",
    title: "Play",
    blurb: "Pick a song and play along on your piano.",
    variant: "play",
  },
  {
    to: "/learn",
    emoji: "🌱",
    title: "Learn",
    blurb: "Short lessons — one new idea at a time.",
    variant: "learn",
  },
  {
    to: "/practice",
    emoji: "⭐",
    title: "Practice",
    blurb: "Fun exercises to get your fingers strong.",
    variant: "practice",
  },
];

export function HomeScreen() {
  const navigate = useNavigate();
  const stars = useProgress((s) => s.totalStars)();

  return (
    <div className="home">
      <div className="home__hero">
        <Mascot mood="wave" size={132} />
        <h1 className="home__title">Hi! Ready to play?</h1>
        <p className="home__subtitle">
          {stars > 0
            ? `You've earned ${stars} ${stars === 1 ? "star" : "stars"} ⭐ — pick something to earn more!`
            : "Pick something to start."}
        </p>
      </div>

      <div className="home__cards">
        {CARDS.map((card) => (
          <button
            key={card.to}
            className={`home-card home-card--${card.variant}`}
            onClick={() => navigate(card.to)}
          >
            <span className="home-card__emoji" aria-hidden="true">
              {card.emoji}
            </span>
            <span className="home-card__title">{card.title}</span>
            <span className="home-card__blurb">{card.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
