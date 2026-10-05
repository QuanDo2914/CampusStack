import { owned, completeGroups, campusBoard } from "../../lib/expanded";
import { money, colors } from "../../lib/board";
import { PlayerToken } from "../tabletop/PlayerToken";
import { CampusIcon } from "../tabletop/CampusIcon";
import type { Snapshot } from "../../types/game";
import { useState, useEffect, useRef } from "react";
export function CampusPlayerPanel({
  snapshot,
  playerId,
  onInspect,
  now,
}: {
  snapshot: Snapshot;
  playerId: string;
  onInspect: (i: number) => void;
  now: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null),
    [deltas, setDeltas] = useState<Record<string, number>>({}),
    previous = useRef<Record<string, number>>({});
  useEffect(() => {
    const next = Object.fromEntries(
      snapshot.players.map((p) => [p.id, p.cash]),
    );
    const changes = Object.fromEntries(
      snapshot.players
        .filter(
          (p) =>
            previous.current[p.id] !== undefined &&
            previous.current[p.id] !== p.cash,
        )
        .map((p) => [p.id, p.cash - previous.current[p.id]]),
    );
    previous.current = next;
    if (Object.keys(changes).length) {
      setDeltas(changes);
      const t = setTimeout(() => setDeltas({}), 1700);
      return () => clearTimeout(t);
    }
  }, [snapshot.players.map((p) => p.cash).join(",")]);
  return (
    <aside className="campus-players compact-player-rail">
      <header>
        <span className="eyebrow">AROUND THE TABLE</span>
        <strong>
          {snapshot.players.filter((p) => !p.bankrupt).length} players
        </strong>
      </header>
      {snapshot.players.map((p) => {
        const mine = owned(snapshot, p.id),
          sets = completeGroups(snapshot, p.id),
          current = p.id === snapshot.current_player_id,
          open = expanded === p.id || (expanded === null && current);
        return (
          <article
            key={p.id}
            className={`campus-player ${current ? "current" : ""} ${p.bankrupt ? "eliminated" : ""} ${open ? "expanded" : ""}`}
            style={{ "--player": colors[p.seat] } as React.CSSProperties}
          >
            <button
              className="rail-player-summary"
              aria-expanded={open}
              onClick={() => setExpanded(open ? "" : p.id)}
            >
              <PlayerToken player={p} />
              <span>
                <strong>
                  {p.name} {p.id === playerId && <small>You</small>}
                </strong>
                <span className="rail-status">
                  {p.bankrupt
                    ? "Spectating"
                    : current
                      ? "Playing now"
                      : p.jailed
                        ? "In Jail"
                        : `${mine.length} assets · ${sets.length} sets`}
                </span>
              </span>
              <b className="rail-cash">{money(p.cash)}</b>
            </button>
            {!!deltas[p.id] && (
              <span
                key={`${snapshot.revision}-${p.id}`}
                className={`cash-float ${deltas[p.id] < 0 ? "cash-loss" : ""}`}
              >
                {deltas[p.id] > 0 ? "+" : ""}
                {money(deltas[p.id])}
              </span>
            )}
            {open && (
              <div className="rail-player-detail">
                <p className="rail-location">{campusBoard[p.position].name}</p>
                <div className="rail-stats">
                  <span>
                    <b>{mine.length}</b> Assets
                  </span>
                  <span>
                    <b>{sets.length}</b> Sets
                  </span>
                  <span>
                    <b>{mine.filter((b) => b.kind === "station").length}/4</b>{" "}
                    Transit
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
                      className={
                        snapshot.assets?.[b.index].mortgaged
                          ? "asset-mortgaged"
                          : ""
                      }
                    >
                      <CampusIcon
                        kind={b.kind}
                        category={b.category}
                        name={b.name}
                      />
                      {snapshot.assets?.[b.index].level ? (
                        <small>{snapshot.assets[b.index].level}</small>
                      ) : null}
                    </button>
                  ))}
                </div>
                <details>
                  <summary>
                    Achievements ({p.achievements?.length || 0})
                  </summary>
                  <p>
                    {p.achievements?.join(" · ") || "Your story starts here."}
                  </p>
                </details>
                <small className="presence">
                  {p.is_bot
                    ? "Computer player"
                    : now - Date.parse(p.last_seen_at) > 40000
                      ? "Reconnecting · seat reserved"
                      : "Connected"}
                </small>
              </div>
            )}
          </article>
        );
      })}
      <p className="rail-tip">
        Inspect a tile to see its deed.
        <br />
        Build a district. Shape the campus.
      </p>
    </aside>
  );
}
