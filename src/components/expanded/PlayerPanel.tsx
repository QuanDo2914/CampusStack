import {
  character,
  owned,
  completeGroups,
  campusBoard,
} from "../../lib/expanded";
import { money, colors } from "../../lib/board";
import type { Snapshot } from "../../types/game";
export function CampusPlayerPanel({
  snapshot,
  playerId,
  onInspect,
  now,
}: {
  snapshot: Snapshot;
  playerId: string;
  onInspect: (index: number) => void;
  now: number;
}) {
  return (
    <aside className="campus-players">
      <h2>Your campus rivals</h2>
      {snapshot.players.map((p) => {
        const mine = owned(snapshot, p.id);
        const sets = completeGroups(snapshot, p.id);
        return (
          <article
            className={`campus-player ${p.id === snapshot.current_player_id ? "current" : ""} ${p.bankrupt ? "eliminated" : ""}`}
            key={p.id}
            style={{ "--player": colors[p.seat] } as React.CSSProperties}
          >
            <div className="player-title">
              <span className="character-token">{character(p).icon}</span>
              <div>
                <h3>
                  {p.name} {p.id === playerId && <small>You</small>}
                </h3>
                <span>
                  {p.bankrupt
                    ? "Bankrupt · spectating"
                    : p.jailed
                      ? "🔒 In Jail"
                      : campusBoard[p.position].name}
                </span>
              </div>
            </div>
            {p.id === snapshot.current_player_id && (
              <b className="current-label">
                {p.id === playerId ? "YOUR TURN" : "CURRENT TURN"}
              </b>
            )}
            <div className="player-metrics">
              <strong>
                {money(p.cash)}
                <small>cash</small>
              </strong>
              <span>
                {mine.length}
                <small>assets</small>
              </span>
              <span>
                {mine.filter((b) => b.kind === "station").length}/4
                <small>stations</small>
              </span>
            </div>
            <div className="set-badges">
              {sets.map((g) => (
                <span key={g.id} style={{ background: g.color }}>
                  ✓ {g.name}
                </span>
              ))}
            </div>
            <div className="owned-mini">
              {mine.map((b) => (
                <button
                  key={b.index}
                  title={b.name}
                  onClick={() => onInspect(b.index)}
                >
                  {b.icon}
                  {snapshot.assets?.[b.index].mortgaged
                    ? "Ⓜ"
                    : snapshot.assets?.[b.index].level
                      ? ` ${snapshot.assets[b.index].level}▰`
                      : ""}
                </button>
              ))}
            </div>
            <details>
              <summary>Achievements ({p.achievements?.length || 0})</summary>
              <p>{p.achievements?.join(" · ") || "Your story starts here."}</p>
            </details>
            <small className="presence">
              {now - Date.parse(p.last_seen_at) > 40000
                ? "Reconnecting · seat reserved"
                : "● Connected"}
            </small>
          </article>
        );
      })}
    </aside>
  );
}
