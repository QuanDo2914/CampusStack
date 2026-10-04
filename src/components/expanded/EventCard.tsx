import { useState } from "react";
import type { Snapshot, Act } from "../../types/game";
import { campusBoard, eligibleUpgrade } from "../../lib/expanded";
export function EventCard({
  snapshot,
  mine,
  busy,
  onAction,
}: {
  snapshot: Snapshot;
  mine: boolean;
  busy: boolean;
  onAction: Act;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const eligible = campusBoard.filter((b) =>
    eligibleUpgrade(snapshot, snapshot.current_player_id!, b.index),
  );
  const selected = eligible.some((b) => b.index === chosen)
    ? chosen!
    : eligible[0]?.index;
  const e = snapshot.active_event;
  if (!e) return null;
  return (
    <section
      key={e.id}
      className="campus-event-card"
      aria-label={`Event ${e.name}`}
    >
      <span>{e.icon}</span>
      <div>
        <strong>{e.name}</strong>
        <p>{e.description}</p>
      </div>
      {snapshot.phase === "event_choice" && mine && (
        <div className="event-options">
          {e.kind === "target" ? (
            snapshot.players
              .filter((p) => p.id !== snapshot.current_player_id && !p.bankrupt)
              .map((p) => (
                <button
                  key={p.id}
                  disabled={busy}
                  onClick={() => onAction("event-choice", { player: p.id })}
                >
                  Award {p.name}
                </button>
              ))
          ) : (
            <>
              <select
                aria-label="Property for renovation grant"
                value={selected ?? ""}
                onChange={(e) => setChosen(Number(e.target.value))}
              >
                {eligible.map((b) => (
                  <option key={b.index} value={b.index}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                disabled={busy || selected === undefined}
                onClick={() => onAction("event-choice", { space: selected })}
              >
                Use free upgrade
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => onAction("event-choice", { skip: true })}
              >
                Skip grant
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
