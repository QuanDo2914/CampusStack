import { useEffect, useRef, useState } from "react";
import { campusBoard } from "../../lib/expanded";
import { BoardTile } from "../tabletop/BoardTile";
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
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
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
      className={`tabletop-scene ${canTravel ? "choosing-destination" : ""}`}
      aria-label="CampusStack isometric tabletop board"
    >
      <div className="tabletop-plane campus-board">
        <div className="campus-lawn" aria-hidden="true">
          <div className="quad-path path-one" />
          <div className="quad-path path-two" />
          <div className="quad-fountain" />
          <span className="quad-tree tree-one" />
          <span className="quad-tree tree-two" />
          <span className="quad-tree tree-three" />
          <span className="quad-tree tree-four" />
          <span className="quad-shrub shrub-one" />
          <span className="quad-shrub shrub-two" />
          <span className="quad-bench bench-one" />
          <span className="quad-bench bench-two" />
          <span className="lawn-label">THE CAMPUS QUAD</span>
        </div>
        {campusBoard.map((b) => (
          <BoardTile
            key={b.index}
            index={b.index}
            snapshot={snapshot}
            occupants={snapshot.players.filter(
              (p) => !p.bankrupt && (positions[p.id] ?? p.position) === b.index,
            )}
            onInspect={onInspect}
            onDestination={onDestination}
            canTravel={canTravel}
          />
        ))}
      </div>
      <section className="campus-center tabletop-stage">{children}</section>
    </div>
  );
}
