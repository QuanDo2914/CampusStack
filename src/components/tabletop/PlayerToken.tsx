import { colors } from "../../lib/board";
import type { Player } from "../../types/game";
export function PlayerToken({
  player,
  compact = false,
}: {
  player: Player;
  compact?: boolean;
}) {
  const c = player.character || "runner",
    robot = c === "robot",
    fox = c === "mascot";
  return (
    <span
      className={`tabletop-token ${compact ? "token-small" : ""} character-${c}`}
      style={{ "--player": colors[player.seat] } as React.CSSProperties}
      aria-label={`${player.name}'s ${c} piece`}
    >
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        fill="none"
        stroke="#24483b"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 58q0-18 19-18t19 18" fill={colors[player.seat]} />
        {robot ? (
          <>
            <rect x="15" y="15" width="34" height="29" rx="9" fill="#e2eddf" />
            <path d="M32 15V8M10 26v10M54 26v10" />
            <circle cx="32" cy="7" r="3" fill="#fac66b" />
            <rect x="22" y="25" width="5" height="5" rx="1" fill="#24483b" />
            <rect x="37" y="25" width="5" height="5" rx="1" fill="#24483b" />
            <path d="M25 37h14" />
          </>
        ) : fox ? (
          <>
            <path
              d="m15 22-2-14 16 9h6L51 8l-2 14q6 23-17 27-24-4-17-27Z"
              fill="#f1a862"
            />
            <path d="m17 31 15 10 15-10q-2 15-15 15T17 31" fill="#fff6dc" />
            <circle cx="23" cy="28" r="2" fill="#24483b" />
            <circle cx="41" cy="28" r="2" fill="#24483b" />
            <path d="m29 36 3 3 3-3Z" fill="#24483b" />
          </>
        ) : (
          <>
            <circle cx="32" cy="29" r="16" fill="#f2c79a" />
            <path d="M17 23q0-15 16-15 17 2 16 18l-10-9-14 3Z" fill="#24483b" />
            <circle cx="26" cy="29" r="1.8" fill="#24483b" />
            <circle cx="39" cy="29" r="1.8" fill="#24483b" />
            <path d="M28 36q4 4 8 0" />
            {c === "engineer" && (
              <>
                <path d="M13 21h39M17 20q0-16 15-16t15 16Z" fill="#f7c657" />
                <path d="M28 6v12M37 6v12" />
              </>
            )}
            {c === "cyclist" && (
              <>
                <path d="M15 20q0-15 17-15t17 15Z" fill="#99c8db" />
                <path d="M23 8v8M32 5v11M41 8v8" />
              </>
            )}
            {c === "runner" && <path d="M17 22h30v5H17Z" fill="#e88e77" />}
            {c === "laptop" && (
              <>
                <rect x="19" y="25" width="12" height="8" rx="3" />
                <rect x="34" y="25" width="12" height="8" rx="3" />
                <path d="M31 28h3" />
              </>
            )}
            {c === "coffee" && (
              <>
                <path d="M17 19q1-16 15-16t15 16Z" fill="#f8f2dc" />
                <path
                  d="M30 4v10M18 48h13v10H18ZM31 50q8 0 4 6h-4"
                  fill="#fff6e5"
                />
              </>
            )}
            {c === "skater" && (
              <>
                <path d="M16 20V9h28v11Z" fill="#b9a5d7" />
                <path d="M13 20h36M12 58h41" />
              </>
            )}
          </>
        )}
      </svg>
    </span>
  );
}
