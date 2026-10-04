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
    <section className="campus-log">
      <h2>
        Campus chronicle <span>Live</span>
      </h2>
      <ol aria-live="polite">
        {events
          .slice(-20)
          .reverse()
          .map((e) => (
            <li key={e.sequence} className={`log-${kind(e.message)}`}>
              <span>
                {kind(e.message) === "reward"
                  ? "✨"
                  : kind(e.message) === "danger"
                    ? "⚠️"
                    : kind(e.message) === "asset"
                      ? "🏘️"
                      : "•"}
              </span>
              {e.message}
            </li>
          ))}
      </ol>
    </section>
  );
}
