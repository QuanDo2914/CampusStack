import type { GameEvent } from "../../types/game";
export function GameLog({ events }: { events: GameEvent[] }) {
  const kind = (m: string) =>
    /WINS/.test(m)
      ? "victory"
      : /bought|trade|upgrade|auction/.test(m)
        ? "asset"
        : /Jail|bankrupt|owes/.test(m)
          ? "danger"
          : /earned|collected/.test(m)
            ? "reward"
            : "normal";
  return (
    <details className="campus-log tabletop-history">
      <summary>
        <span className="history-live">LIVE</span>
        <span role="status">
          {events.at(-1)?.message || "Welcome to the campus."}
        </span>
        <strong>History ↗</strong>
      </summary>
      <ol aria-live="polite">
        {events
          .slice(-20)
          .reverse()
          .map((e) => (
            <li key={e.sequence} className={`log-${kind(e.message)}`}>
              <span>
                {kind(e.message) === "reward"
                  ? "+"
                  : kind(e.message) === "danger"
                    ? "!"
                    : kind(e.message) === "asset"
                      ? "▰"
                      : "•"}
              </span>
              {e.message}
            </li>
          ))}
      </ol>
    </details>
  );
}
