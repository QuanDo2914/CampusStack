import { useEffect, useRef, useState } from "react";
import { DiamondSurface } from "../components/tabletop/DiamondSurface";
import { DiamondScenery } from "../components/tabletop/DiamondScenery";
import { BoardTile } from "../components/tabletop/BoardTile";
import { campusBoard } from "../lib/expanded";
import type { Player, Snapshot } from "../types/game";

const players: Player[] = ["runner", "cyclist", "engineer", "robot"].map(
  (character, seat) => ({
    id: `fixture-${seat}`,
    name: `Player ${seat + 1}`,
    seat,
    character,
    cash: 1500,
    position: 0,
    last_seen_at: new Date().toISOString(),
  }),
);
export const tileFixture: Snapshot = {
  rules_version: 2,
  room_session_id: "visual-fixture",
  status: "active",
  host_player_id: players[0].id,
  revision: 1,
  current_player_id: players[0].id,
  phase: "awaiting_roll",
  pending_property: null,
  last_die: null,
  match_ends_at: null,
  turn_ends_at: null,
  players,
  ownership: {},
  events: [],
  assets: Object.fromEntries(
    campusBoard
      .filter((b) => b.price)
      .map((b) => [
        b.index,
        {
          owner: players[b.index % 4].id,
          level: b.kind === "property" ? b.index % 6 : 0,
          mortgaged: b.index % 7 === 0,
        },
      ]),
  ),
};

type Point = { x: number; y: number };
// Recover oriented rectangles from rotated DOM bounds. Axis-aligned bounds
// over-report collisions between neighboring diagonal labels.
function polygon(rect: DOMRect, angle = 0): Point[] {
  const c = Math.cos(angle), s = Math.sin(angle), ac = Math.abs(c), as = Math.abs(s);
  const determinant = ac * ac - as * as;
  const w = (ac * rect.width - as * rect.height) / determinant;
  const h = (ac * rect.height - as * rect.width) / determinant;
  const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
  return [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([u,v]) => ({x:x+u*c-v*s,y:y+u*s+v*c}));
}
function intersects(a: Point[], b: Point[]): boolean {
  return ![a,b].some(p => p.some((point,i) => {
    const next = p[(i+1)%p.length], axis = {x:-(next.y-point.y),y:next.x-point.x};
    const project = (q: Point[]) => q.map(v => v.x*axis.x+v.y*axis.y);
    const aa = project(a), bb = project(b), tolerance = Math.hypot(axis.x,axis.y);
    return Math.max(...aa) <= Math.min(...bb)+tolerance || Math.max(...bb) <= Math.min(...aa)+tolerance;
  }));
}
export function auditTiles(root: HTMLElement): string[] {
  const failures: string[] = [];
  const tiles = [...root.querySelectorAll<HTMLElement>(".tabletop-tile")];
  const zones: Point[][] = [];
  const zoneNames: string[] = [];
  const zoneOwners: string[] = [];
  const textZones = (element: HTMLElement, angle: number) => {
    const range = document.createRange(); range.selectNodeContents(element);
    return [...range.getClientRects()].map(r => polygon(r,angle));
  };
  tiles.forEach(tile => {
    const name = tile.title, title = tile.querySelector<HTMLElement>(".tile-title")!, copy = tile.querySelector<HTMLElement>(".tile-copy")!;
    const face = tile.querySelector<HTMLElement>(".tile-face,.corner-face")!;
    const matrix = new DOMMatrix(getComputedStyle(face).transform);
    const angle = Math.atan2(matrix.b,matrix.a);
    const icon = tile.querySelector<HTMLElement>(".tile-emblem,.corner-emblem")!;
    const text = textZones(title,angle), emblem = polygon(icon.getBoundingClientRect(),angle);
    zones.push(...text,emblem); zoneOwners.push(...text.map(() => name),name); zoneNames.push(...text.map(() => name + " title"),name + " icon");
    if (title.scrollWidth > title.clientWidth+1) failures.push(`${name}: title too wide`);
    if (title.clientHeight > parseFloat(getComputedStyle(title).lineHeight)*2+1) failures.push(`${name}: more than two title lines`);
    const price = copy.querySelector<HTMLElement>("small");
    if (price) { const prices = textZones(price,angle); zones.push(...prices); zoneOwners.push(...prices.map(() => name)); zoneNames.push(...prices.map(() => name + " price")); if (price.scrollWidth > price.clientWidth+1) failures.push(`${name}: subtitle overflow`); }
    if (text.some(p => intersects(p,emblem))) failures.push(`${name}: icon/title overlap`);
  });
  zones.forEach((a,i) => zones.slice(i+1).forEach((b,k) => {
    const j = i+k+1;
    if (zoneOwners[i] !== zoneOwners[j] && intersects(a,b)) failures.push(`${zoneNames[i]} / ${zoneNames[j]}: cross-tile content overlap`);
  }));
  tiles.forEach(tile => tile.querySelectorAll<HTMLElement>(".piece-position .tabletop-token,.tile-buildings,.corner-monument,.tile-owner-marker,.mortgage-lock").forEach(marker => {
    const collision = zones.findIndex(z => intersects(z,polygon(marker.getBoundingClientRect())));
    if (collision >= 0) failures.push(`${tile.title}: marker/content overlap (${marker.getAttribute("class")} / ${zoneNames[collision]})`);
  }));
  return failures;
}
export default function TileLab() {
  const root = useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = useState(false);
  const [failures, setFailures] = useState<string[]>([]);
  useEffect(() => {
    const element = root.current!;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setFailures(auditTiles(element)), 150);
    };
    const observer = new ResizeObserver(check);
    observer.observe(element);
    element.querySelectorAll(".tile-face").forEach(e => observer.observe(e));
    const mutations = new MutationObserver(check);
    mutations.observe(element, {
      subtree: true,
      attributes: true,
      childList: true,
      characterData: true,
    });
    let active = true;
    document.fonts.ready.then(() => {
      if (active) check();
    });
    check();
    return () => {
      active = false;
      clearTimeout(timer);
      observer.disconnect();
      mutations.disconnect();
    };
  }, [stacked]);
  return (
    <main className="tabletop-app tile-lab">
      <header className="app-header">
        <h1>CampusStack · Tile layout lab</h1>
        <a href="/">Back to game</a>
      </header>
      <div className="connection-bar">
        Development only · no server/session access
      </div>
      <div className="tile-lab-tools">
        <button onClick={() => setFailures(auditTiles(root.current!))}>Recheck layout</button>
        <label>
          <input
            type="checkbox"
            checked={stacked}
            onChange={(e) => setStacked(e.target.checked)}
          />
          Four pieces on every space
        </label>
        <span>
          40 spaces · ownership, mortgages and development stress fixture
        </span>
      </div>
      <div className="expanded-layout">
        <div className="board-scroll">
          <div ref={root} className="tabletop-scene diamond-scene">
            <div className="diamond-board">
              <DiamondScenery />
              <DiamondSurface snapshot={tileFixture}/>
              {campusBoard.map((b) => (
                <BoardTile
                  key={b.index}
                  index={b.index}
                  diamond
                  snapshot={tileFixture}
                  occupants={stacked ? players : [players[b.index % 4]]}
                  onInspect={() => {}}
                  onDestination={() => {}}
                  canTravel={false}
                />
              ))}
            </div>

          </div>
        </div>
        <aside className="tile-lab-report" data-pass={!failures.length}>
          <strong>
            {failures.length
              ? "Overflow / overlap detected"
              : "PASS · 40 spaces"}
          </strong>
          <ul>
            {failures.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          <p>
            Checks title width/height, subtitle overflow, and icon/marker
            collisions.
          </p>
        </aside>
      </div>
    </main>
  );
}
