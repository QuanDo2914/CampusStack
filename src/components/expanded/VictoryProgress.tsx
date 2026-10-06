import { campusBoard, completeGroups, owned } from "../../lib/expanded";
import type { Snapshot } from "../../types/game";
export function VictoryProgress({
  snapshot,
  playerId,
}: {
  snapshot: Snapshot;
  playerId: string;
}) {
  const mine = owned(snapshot, playerId);
  const sets = completeGroups(snapshot, playerId);
  const upgraded = sets.filter((g) =>
    campusBoard
      .filter((b) => b.category === g.id)
      .every(
        (b) =>
          snapshot.assets?.[b.index].level === 5 &&
          !snapshot.assets[b.index].mortgaged,
      ),
  );
  const bestSide = Math.max(
    ...[0, 1, 2, 3].map((side) => {
      const tiles = campusBoard.filter(
        (b) =>
          b.side === side && (b.kind === "property" || b.kind === "station"),
      );
      return (
        tiles.filter((b) => snapshot.assets?.[b.index]?.owner === playerId)
          .length / tiles.length
      );
    }),
  );
  return (
    <div className="victory-progress">
      <div>
        <span>🏁 Last standing</span>
        <strong>
          {snapshot.players.filter((p) => !p.bankrupt).length} rivals in play
        </strong>
      </div>
      <div>
        <span>🧱 Side control</span>
        <strong>{Math.round(bestSide * 100)}% best side</strong>
      </div>
      <div>
        <span>🚉 Transit</span>
        <strong>
          {mine.filter((b) => b.kind === "station").length} / 4 stations
        </strong>
      </div>
      <div>
        <span>🏗️ Empire</span>
        <strong>
          {sets.length} / 3 sets · {upgraded.length} / 2 developed
        </strong>
      </div>
    </div>
  );
}
