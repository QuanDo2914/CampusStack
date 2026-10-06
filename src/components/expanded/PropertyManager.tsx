import { CampusIcon } from "../tabletop/CampusIcon";
import { campusBoard, owned, completeGroups, levels } from "../../lib/expanded";
import { money } from "../../lib/board";
import type { Act, Snapshot } from "../../types/game";
import { Modal } from "./Modal";
export function PropertyManager({
  snapshot,
  playerId,
  busy,
  onAction,
  onClose,
}: {
  snapshot: Snapshot;
  playerId: string;
  busy: boolean;
  onAction: Act;
  onClose: () => void;
}) {
  const mine = owned(snapshot, playerId);
  const sets = completeGroups(snapshot, playerId);
  const p = snapshot.players.find((p) => p.id === playerId)!;
  const debt = snapshot.phase === "debt";
  const current = snapshot.current_player_id === playerId && !p.bankrupt;
  return (
    <Modal title="Property manager" onClose={onClose}>
      <p>
        Your cash: <strong>{money(p.cash)}</strong>.{" "}
        {current
          ? "Manage assets during your turn."
          : "Inspect assets; actions unlock on your turn."}
      </p>
      {mine.length === 0 && (
        <p>No assets yet. Land on a property to buy, or make a trade.</p>
      )}
      <div className="manager-list">
        {mine.map((b) => {
          const a = snapshot.assets![b.index];
          const set = campusBoard.filter((s) => s.category === b.category);
          const assets = set.map((s) => snapshot.assets?.[s.index]);
          const canBuild =
            sets.some((g) => g.id === b.category) &&
            assets.every((x) => x && !x.mortgaged) &&
            a.level === Math.min(...assets.map((x) => x?.level || 0));
          const hasBuildings = assets.some((x) => x && x.level > 0);
          return (
            <article key={b.index}>
              <h3>
                <CampusIcon kind={b.kind} category={b.category} name={b.name} />
                {b.name}
              </h3>
              <p>
                {a.mortgaged ? "MORTGAGED" : levels[a.level]} ·{" "}
                {b.kind === "property"
                  ? `Next rent: ${money(b.rents[Math.min(5, a.level + 1)])}`
                  : "Transit asset"}
              </p>
              <div className="action-row">
                {b.kind === "property" && (
                  <>
                    <button
                      disabled={
                        busy ||
                        !current ||
                        debt ||
                        !canBuild ||
                        a.level >= 5 ||
                        p.cash < b.upgrade_cost
                      }
                      onClick={() => onAction("upgrade", { space: b.index })}
                    >
                      Build {money(b.upgrade_cost)}
                    </button>
                    <button
                      className="secondary"
                      disabled={
                        busy ||
                        !current ||
                        a.level === 0 ||
                        a.level !==
                          Math.max(...assets.map((x) => x?.level || 0))
                      }
                      onClick={() => onAction("downgrade", { space: b.index })}
                    >
                      Sell upgrade +{money(Math.floor(b.upgrade_cost / 2))}
                    </button>
                  </>
                )}
                <button
                  className="secondary"
                  disabled={
                    busy ||
                    !current ||
                    (a.mortgaged
                      ? debt || p.cash < Math.ceil(b.mortgage * 1.1)
                      : hasBuildings)
                  }
                  onClick={() =>
                    onAction(a.mortgaged ? "unmortgage" : "mortgage", {
                      space: b.index,
                    })
                  }
                >
                  {a.mortgaged
                    ? `Unmortgage ${money(Math.ceil(b.mortgage * 1.1))}`
                    : `Mortgage +${money(b.mortgage)}`}
                </button>
                <button
                  className="secondary"
                  disabled={busy || !current || hasBuildings}
                  onClick={() => onAction("sell", { space: b.index })}
                >
                  Sell to bank +{money(a.mortgaged ? 0 : b.mortgage)}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="fine-print">
        Mortgaging requires no buildings in the group. Unmortgaging costs
        mortgage value + 10%. Assets with group buildings cannot be traded or
        sold.
      </p>
    </Modal>
  );
}
