import spaces from "../data/board.json";
import groups from "../data/groups.json";
import characters from "../data/characters.json";
import type { Snapshot, Asset, Player } from "../types/game";
export { groups, characters };
export const campusBoard = spaces;
export const purchasable = (space: (typeof spaces)[number]) =>
  space.kind === "property" || space.kind === "station";
export const character = (p?: Player) =>
  characters.find((c) => c.id === p?.character) || characters[0];
export const owned = (s: Snapshot, id: string) =>
  spaces.filter((b) => s.assets?.[b.index]?.owner === id);
export const completeGroups = (s: Snapshot, id: string) =>
  groups.filter((g) =>
    spaces
      .filter((b) => b.category === g.id)
      .every((b) => s.assets?.[b.index]?.owner === id),
  );
export const rent = (s: Snapshot, index: number) => {
  const b = spaces[index];
  const a: Asset | undefined = s.assets?.[index];
  if (!a || a.mortgaged) return 0;
  if (b.kind === "station")
    return (
      25 *
      2 ** (owned(s, a.owner).filter((x) => x.kind === "station").length - 1)
    );
  return (
    b.rents[a.level] *
    (a.level === 0 &&
    spaces
      .filter((x) => x.category === b.category)
      .every(
        (x) =>
          s.assets?.[x.index]?.owner === a.owner &&
          !s.assets[x.index].mortgaged,
      )
      ? 2
      : 1)
  );
};
export const tilePosition = (i: number): [number, number] =>
  i <= 10
    ? [1, 11 - i]
    : i <= 20
      ? [i - 9, 1]
      : i <= 30
        ? [11, i - 19]
        : [41 - i, 11];
export const levels = [
  "Original",
  "Renovation",
  "Expansion",
  "Campus Hub",
  "Major Complex",
  "Landmark",
];
export const victoryLabels = {
  LAST_PLAYER_STANDING: "Last Player Standing",
  STRAIGHT_LINE: "Straight-Line Monopoly",
  TRANSIT_MONOPOLY: "Transit Monopoly",
  PROPERTY_EMPIRE: "Property Empire",
};

export function eligibleUpgrade(s: Snapshot, playerId: string, index: number) {
  const b = campusBoard[index];
  const a = s.assets?.[index];
  if (
    b.kind !== "property" ||
    !a ||
    a.owner !== playerId ||
    a.mortgaged ||
    a.level >= 5
  )
    return false;
  const set = campusBoard
    .filter((x) => x.category === b.category)
    .map((x) => s.assets?.[x.index]);
  return (
    set.every((x) => x && x.owner === playerId && !x.mortgaged) &&
    a.level === Math.min(...set.map((x) => x?.level || 0))
  );
}
