import type { CSSProperties } from "react";

interface BotGlyphProps {
  color: string;
  seed: string;
  size?: "small" | "medium" | "large";
  active?: boolean;
}

function hash(value: string): number {
  return [...value].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 7);
}

export function BotGlyph({ color, seed, size = "medium", active = false }: BotGlyphProps) {
  const value = hash(seed);
  const variant = value % 4;
  const turns = (value % 19) - 9;
  const style = { "--glyph-color": color, "--glyph-turn": `${turns}deg` } as CSSProperties;

  return (
    <span className={`bot-glyph bot-glyph--${size}${active ? " is-active" : ""}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        {variant === 0 && (
          <>
            <path d="M7 9.5 16 4l9 5.5v12L16 27l-9-5.5Z" />
            <path d="m10.5 19 5.5-9 5.5 9Z" className="glyph-cut" />
          </>
        )}
        {variant === 1 && (
          <>
            <circle cx="16" cy="16" r="11" />
            <path d="M8.5 16c2.9-6.6 12.1-6.6 15 0-2.9 6.6-12.1 6.6-15 0Z" className="glyph-cut" />
            <circle cx="16" cy="16" r="2.5" />
          </>
        )}
        {variant === 2 && (
          <>
            <path d="M5 16 16 5l11 11-11 11Z" />
            <path d="M11 11h10v10H11z" className="glyph-cut" />
          </>
        )}
        {variant === 3 && (
          <>
            <path d="M16 4.5 27.5 25H4.5Z" />
            <path d="M16 10.5 21.5 21h-11Z" className="glyph-cut" />
          </>
        )}
      </svg>
    </span>
  );
}
