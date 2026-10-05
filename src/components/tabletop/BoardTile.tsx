import { CampusIcon } from "./CampusIcon";
import { PlayerToken } from "./PlayerToken";
import { campusBoard, groups, tilePosition } from "../../lib/expanded";
import { colors, money } from "../../lib/board";
import type { Snapshot, Player } from "../../types/game";
const shortNames = [
  "START",
  "Eng. Café",
  "Green St.",
  "Bulletin",
  "Library Café",
  "West Station",
  "Bike Hub",
  "Campus Gym",
  "Lab Fee",
  "Rec Center",
  "AIRPORT",
  "Art Studio",
  "Music Hall",
  "News",
  "Cinema",
  "North Station",
  "Apartments",
  "Study Quad",
  "Parking",
  "Grad Lofts",
  "GO TO JAIL",
  "Science",
  "Bio Lab",
  "Research",
  "Observatory",
  "East Station",
  "Innovation",
  "Makerspace",
  "Club Fee",
  "Tech Park",
  "JAIL / VISIT",
  "Union",
  "Market",
  "Quad Cards",
  "Alumni Hall",
  "South Station",
  "Gardens",
  "Solar Lab",
  "Alumni News",
  "Eco Center",
];
export function BoardTile({
  index,
  snapshot,
  occupants,
  onInspect,
  onDestination,
  canTravel,
}: {
  index: number;
  snapshot: Snapshot;
  occupants: Player[];
  onInspect: (i: number) => void;
  onDestination: (i: number) => void;
  canTravel: boolean;
}) {
  const b = campusBoard[index],
    [col, row] = tilePosition(index),
    a = snapshot.assets?.[index],
    owner = snapshot.players.find((p) => p.id === a?.owner);
  const set =
    b.kind === "property" &&
    owner &&
    campusBoard
      .filter((x) => x.category === b.category)
      .every((x) => snapshot.assets?.[x.index]?.owner === owner.id);
  return (
    <button
      data-testid={`space-${index}`}
      className={`campus-space tabletop-tile kind-${b.kind} district-${b.category} ${index % 10 === 0 ? "corner" : ""} ${a?.mortgaged ? "mortgaged" : ""} ${set ? "set-complete" : ""} ${snapshot.pending_property === index ? "offered" : ""} ${occupants.length ? "occupied" : ""}`}
      style={
        {
          gridColumn: col,
          gridRow: row,
          "--group":
            groups.find((g) => g.id === b.category)?.color || "#679587",
          "--owner": owner ? colors[owner.seat] : "transparent",
        } as React.CSSProperties
      }
      onClick={() =>
        canTravel && index !== 10 ? onDestination(index) : onInspect(index)
      }
      aria-label={`${b.name}${owner ? `, owned by ${owner.name}` : ""}${a?.mortgaged ? ", mortgaged" : ""}${canTravel && index !== 10 ? ", fly here" : ""}`}
      title={b.name}
    >
      <CampusIcon kind={b.kind} category={b.category} name={b.name} />
      <span className="tile-copy">
        <strong>{shortNames[index]}</strong>
        <small>
          {a?.mortgaged
            ? "LOCKED"
            : b.price
              ? money(b.price)
              : b.kind === "start"
                ? "+$100"
                : b.kind === "fee"
                  ? `−${money(b.fee)}`
                  : b.kind === "event"
                    ? "DRAW"
                    : b.kind === "airport"
                      ? "FLY ANYWHERE"
                      : b.kind === "jail"
                        ? "VISITING / INSIDE"
                        : ""}
        </small>
      </span>
      {owner && (
        <span className="tile-owner" title={`Owned by ${owner.name}`}>
          <span>
            <PlayerToken player={owner} compact />
          </span>
        </span>
      )}
      {a?.mortgaged && (
        <svg className="mortgage-lock" viewBox="0 0 20 24" aria-hidden="true">
          <path d="M5 10V6a5 5 0 0 1 10 0v4M3 10h14v12H3Z" />
          <path d="M10 15v3" />
        </svg>
      )}
      {!!a?.level && (
        <span
          className={`tile-buildings ${a.level === 5 ? "landmark" : ""}`}
          aria-label={`${a.level} development levels`}
        >
          {a.level === 5 ? (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M2 19V8h5V3l3-3 3 3v5h5v11ZM8 7h4M8 11h4M8 15h4" />
            </svg>
          ) : (
            Array.from({ length: a.level }, (_, i) => (
              <svg key={i} viewBox="0 0 16 16" aria-hidden="true">
                <path d="m1 7 7-6 7 6v8H2V7Zm5 8V9h4v6" />
              </svg>
            ))
          )}
        </span>
      )}
      <span className="campus-tokens">
        {occupants.map((p, i) => (
          <span
            key={p.id}
            className={`piece-position ${p.jailed ? "inside-jail" : ""}`}
            style={
              { "--fan": i - (occupants.length - 1) / 2 } as React.CSSProperties
            }
            aria-label={`${p.name} at ${b.name}`}
          >
            <PlayerToken player={p} compact />
          </span>
        ))}
      </span>
    </button>
  );
}
