import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./BigButton.css";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children: ReactNode;
}

export function BigButton({
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  ...rest
}: BigButtonProps) {
  return (
    <button
      className={`big-btn big-btn--${variant} big-btn--${size} ${className}`}
      {...rest}
    >
      {icon && <span className="big-btn__icon" aria-hidden="true">{icon}</span>}
      <span className="big-btn__label">{children}</span>
    </button>
  );
}
