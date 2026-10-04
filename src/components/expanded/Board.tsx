import { useEffect, useRef, useState } from "react";
import {
  campusBoard,
  character,
  groups,
  tilePosition,
} from "../../lib/expanded";
import { colors, money } from "../../lib/board";
import type { Snapshot } from "../../types/game";
export function CampusBoard({
  snapshot,
  children,
  onInspect,
  onDestination,
  canTravel,
}: {
  snapshot: Snapshot;
  children: React.ReactNode;
  onInspect: (index: number) => void;
  onDestination: (index: number) => void;
  canTravel: boolean;
}) {
  const [positions, setPositions] = useState<Record<string, number>>({});
  const previous = useRef<Snapshot | null>(null);
  useEffect(() => {
    const old = previous.current;
    previous.current = snapshot;
    const m = snapshot.movement;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const next = Object.fromEntries(
      snapshot.players.map((p) => [p.id, p.position]),
    );
    if (
      old &&
      m &&
      JSON.stringify(old.movement) !== JSON.stringify(m) &&
      m.type === "walk" &&
      m.from !== undefined &&
      m.steps
    ) {
      next[m.player] = m.from;
      for (let i = 1; i <= m.steps; i++) {
        const pos = (m.from + i) % 40;
        timers.push(
          setTimeout(
            () =>
              setPositions((p) => ({
                ...p,
                [m.player]:
                  i === m.steps
                    ? snapshot.players.find((p) => p.id === m.player)!.position
                    : pos,
              })),
            i * 85,
          ),
        );
      }
    }
    setPositions(next);
    return () => timers.forEach(clearTimeout);
  }, [snapshot.revision]);
  return (
    <div
      className={`campus-board ${canTravel ? "choosing-destination" : ""}`}
      aria-label="CampusStack square board"
    >
      {campusBoard.map((b) => {
        const [col, row] = tilePosition(b.index);
        const asset = snapshot.assets?.[b.index];
        const owner = snapshot.players.find((p) => p.id === asset?.owner);
        const won =
          snapshot.winner?.type === "STRAIGHT_LINE" &&
          snapshot.winner.side === b.side;
        return (
          <button
            key={b.index}
            className={`campus-space ${b.index % 10 === 0 ? "corner" : ""} kind-${b.kind} ${snapshot.pending_property === b.index ? "offered" : ""} ${asset?.mortgaged ? "mortgaged" : ""} ${won ? "winning-side" : ""}`}
            style={
              {
                gridColumn: col,
                gridRow: row,
                "--group":
                  groups.find((g) => g.id === b.category)?.color || "#789993",
                "--owner": owner ? colors[owner.seat] : "transparent",
              } as React.CSSProperties
            }
            onClick={() =>
              canTravel && b.index !== 10
                ? onDestination(b.index)
                : onInspect(b.index)
            }
            aria-label={`${b.name}${owner ? `, owned by ${owner.name}` : ""}${canTravel && b.index !== 10 ? ", fly here" : ""}`}
            data-testid={`space-${b.index}`}
          >
            <span className="space-icon">{b.icon}</span>
            <strong>{b.name}</strong>
            <small>
              {b.kind === "start"
                ? "+$100"
                : asset?.mortgaged
                  ? "MORTGAGED"
                  : asset?.level
                    ? `${asset.level} ▰`
                    : b.price
                      ? money(b.price)
                      : b.kind === "fee"
                        ? `−${money(b.fee)}`
                        : b.kind === "airport"
                          ? "Choose destination"
                          : b.kind === "jail"
                            ? "Visiting / inside"
                            : ""}
            </small>
            <div className="campus-tokens">
              {snapshot.players
                .filter(
                  (p) =>
                    !p.bankrupt && (positions[p.id] ?? p.position) === b.index,
                )
                .map((p) => (
                  <span
                    key={p.id}
                    className={`board-character ${p.jailed ? "inside-jail" : ""}`}
                    style={{ borderColor: colors[p.seat] }}
                    title={`${p.name}${p.jailed ? " · jailed" : ""}`}
                    aria-label={`${p.name} at ${b.name}`}
                  >
                    {character(p).icon}
                  </span>
                ))}
            </div>
            {owner && <i className="ownership-strip" title={owner.name} />}
          </button>
        );
      })}
      <section className="campus-center">{children}</section>
    </div>
  );
}
