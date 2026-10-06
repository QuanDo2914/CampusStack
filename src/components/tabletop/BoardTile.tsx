import { diamondFacePath } from "./diamondGeometry";
import { CornerMonument } from "./CornerMonument";
import { MiniatureBuilding } from "./MiniatureBuilding";
import { TileLabel } from "./TileLabel";
import { tileDisplayNames } from "./displayNames";
import { CornerTile } from "./CornerTile";
import { CampusIcon } from "./CampusIcon";
import { PlayerToken } from "./PlayerToken";
import { campusBoard, groups, tilePosition } from "../../lib/expanded";
import { colors, money } from "../../lib/board";
import type { Snapshot, Player } from "../../types/game";
export function BoardTile({
  index,
  snapshot,
  occupants,
  onInspect,
  onDestination,
  canTravel,
  diamond = false,
}: {
  index: number;
  snapshot: Snapshot;
  occupants: Player[];
  onInspect: (i: number) => void;
  onDestination: (i: number) => void;
  canTravel: boolean;
  diamond?: boolean;
}) {
  const b = campusBoard[index],
    [col, row] = tilePosition(index),
    a = snapshot.assets?.[index],
    owner = snapshot.players.find((p) => p.id === a?.owner);
  const edge =
    row === 1 ? "top" : row === 11 ? "bottom" : col === 1 ? "left" : "right";
  const set =
    b.kind === "property" &&
    owner &&
    campusBoard
      .filter((x) => x.category === b.category)
      .every((x) => snapshot.assets?.[x.index]?.owner === owner.id);
  const subtitle = b.price
    ? money(b.price)
    : b.kind === "start"
      ? "+$100"
      : b.kind === "fee"
        ? `−${money(b.fee)}`
        : b.kind === "event"
          ? "Draw"
          : b.kind === "airport"
            ? "Fast Travel"
            : b.kind === "jail"
              ? "Visiting"
              : b.kind === "go_to_jail"
                ? "Security"
                : b.kind === "parking"
                  ? "Rest"
                  : "";
  const tileFace = diamondFacePath(index, edge);
  const emblem = (
    <CampusIcon kind={b.kind} category={b.category} name={b.name} />
  );
  return (
    <button
      data-testid={`space-${index}`}
      data-edge={edge}
      data-corner={index % 10 === 0 ? index : undefined}
      data-corner-distance={Math.min(index % 10, 10 - index % 10)}
      className={`campus-space tabletop-tile ${diamond ? "isometric-tile" : ""} kind-${b.kind} district-${b.category} ${index % 10 === 0 ? "corner" : ""} ${owner ? "owned" : ""} ${a?.mortgaged ? "mortgaged" : ""} ${set ? "set-complete" : ""} ${snapshot.pending_property === index ? "offered" : ""} ${occupants.length ? "occupied" : ""}`}
      style={
        {
          gridColumn: col,
          gridRow: row,
          ...(diamond ? { left: `${50 + (col-row)*50/11}%`, top: `${(col+row-1)*50/11}%` } : {}),
          "--corner-distance": Math.min(index % 10, 10 - index % 10),
          "--corner-shift": index % 10 <= 2 ? (3 - index % 10) * 27 : index % 10 >= 8 ? -(index % 10 - 7) * 27 : 0,
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
      {diamond && <svg className="diamond-tile-face" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path className="tile-rim" d={tileFace}/><path className="district-edge" d="M5 50 50 5 95 50"/><path className="owner-edge" d="M5 52 50 97 95 52"/></svg>}
      {diamond && index % 10 === 0 && <CornerMonument index={index}/> }
      {index % 10 === 0 ? (
        <CornerTile
          emblem={emblem}
          label={tileDisplayNames[index]}
          subtitle={subtitle}
        />
      ) : (
        <span className="tile-face">
          <span className="tile-emblem">{emblem}</span>
          <TileLabel label={tileDisplayNames[index]} subtitle={subtitle} />
        </span>
      )}
      {owner && (
        <>
          <span className="tile-owner" aria-hidden="true" />
          <span className="tile-owner-marker" title={`Owned by ${owner.name}`}>
            <PlayerToken player={owner} compact />
          </span>
        </>
      )}
      {a?.mortgaged && (
        <svg className="mortgage-lock" viewBox="0 0 20 24" aria-hidden="true">
          <title>Mortgaged</title>
          <path d="M5 10V6a5 5 0 0 1 10 0v4M3 10h14v12H3Z" />
          <path d="M10 15v3" />
        </svg>
      )}
      {!!a?.level && (
        <span
          key={a.level}
          className={`tile-buildings ${a.level === 5 ? "landmark" : ""}`}
          aria-label={`${a.level} development levels`}
        >
          <MiniatureBuilding level={a.level} color={groups.find(g => g.id === b.category)?.color || "#739c7d"} />
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
