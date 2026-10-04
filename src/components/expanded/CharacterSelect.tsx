import { characters } from "../../lib/expanded";
import type { Act, Snapshot } from "../../types/game";
export function CharacterSelect({
  snapshot,
  playerId,
  busy,
  onAction,
}: {
  snapshot: Snapshot;
  playerId: string;
  busy: boolean;
  onAction: Act;
}) {
  return (
    <section className="character-select">
      <h2>Choose your campus companion</h2>
      <p>Unique tokens. Equal footing. Pick your personality.</p>
      <div className="character-grid">
        {characters.map((c) => {
          const owner = snapshot.players.find((p) => p.character === c.id);
          return (
            <button
              key={c.id}
              className={`secondary ${owner?.id === playerId ? "selected" : ""}`}
              disabled={busy || Boolean(owner && owner.id !== playerId)}
              aria-pressed={owner?.id === playerId}
              onClick={() => onAction("character", { character: c.id })}
            >
              <span>{c.icon}</span>
              <strong>{c.name}</strong>
              <small>{owner?.name || "Available"}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
