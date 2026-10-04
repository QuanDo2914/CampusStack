import {
  campusBoard,
  groups,
  levels,
  rent,
  purchasable,
} from "../../lib/expanded";
import { money } from "../../lib/board";
import type { Snapshot } from "../../types/game";
import { Modal } from "./Modal";
export function PropertyCard({
  index,
  snapshot,
  onClose,
}: {
  index: number;
  snapshot: Snapshot;
  onClose: () => void;
}) {
  const b = campusBoard[index];
  const a = snapshot.assets?.[index];
  const owner = snapshot.players.find((p) => p.id === a?.owner);
  if (!purchasable(b)) {
    const explanations: Record<string, string> = {
      start:
        "Normal dice movement passing or landing here awards $100 once. Teleportation pays no salary.",
      airport:
        "Choose any other space and fly there. Resolve the destination normally. Flying never pays START salary.",
      jail: "Visitors are free. Imprisoned players can attempt doubles, pay $50 or use a Jail pass.",
      go_to_jail:
        "Go directly to Jail and end your turn. This transfer pays no salary.",
      event:
        "Draw one of 30 campus event cards. Resolve its effect or choice before continuing.",
      fee: `Pay the bank ${money(b.fee)}. If needed, raise cash before resolving the debt.`,
      parking: "A restful campus stop. No charge or reward.",
    };
    return (
      <Modal title={b.name} onClose={onClose}>
        <div className="property-art">{b.icon}</div>
        <p>{explanations[b.kind]}</p>
        <p className="fine-print">This space cannot be purchased.</p>
      </Modal>
    );
  }
  return (
    <Modal title={b.name} onClose={onClose} className="property-card">
      <div
        className="property-art"
        style={{
          background:
            groups.find((g) => g.id === b.category)?.color || "#dae7e5",
        }}
      >
        {b.icon}
      </div>
      <p>
        {groups.find((g) => g.id === b.category)?.name ||
          b.kind.replaceAll("_", " ")}{" "}
        · {owner ? `Owned by ${owner.name}` : "Unowned"}
        {a?.mortgaged ? " · MORTGAGED" : ""}
      </p>
      <div className="detail-grid">
        <span>
          Purchase <strong>{money(b.price)}</strong>
        </span>
        <span>
          Mortgage <strong>{money(b.mortgage)}</strong>
        </span>
        <span>
          Current rent{" "}
          <strong>{money(a ? rent(snapshot, index) : b.rent)}</strong>
        </span>
        <span>
          Upgrade <strong>{money(b.upgrade_cost)}</strong>
        </span>
      </div>
      {b.kind === "property" && (
        <>
          <p>
            Current level: <strong>{levels[a?.level || 0]}</strong>
          </p>
          <table>
            <caption>Rent at each development level</caption>
            <tbody>
              {b.rents.map((r, i) => (
                <tr key={i}>
                  <th>{levels[i]}</th>
                  <td>{money(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fine-print">
            An undeveloped complete, unmortgaged set doubles base rent. Develop
            evenly. Sell upgrades for half their cost.
          </p>
        </>
      )}
      {b.kind === "station" && (
        <p>
          Rent with 1 / 2 / 3 / 4 stations: $25 / $50 / $100 / $200. Mortgage
          stops this station’s rent.
        </p>
      )}
    </Modal>
  );
}
