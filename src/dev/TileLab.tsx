import { useEffect, useRef, useState } from "react";
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
const snapshot: Snapshot = {
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

const intersects = (a: DOMRect, b: DOMRect) =>
  a.left < b.right - 1 &&
  a.right > b.left + 1 &&
  a.top < b.bottom - 1 &&
  a.bottom > b.top + 1;
// Read-only geometry audit: no engine, session or server access.
export function auditTiles(root: HTMLElement): string[] {
  const failures: string[] = [];
  const tiles = [...root.querySelectorAll<HTMLElement>(".tabletop-tile")];
  const zones = tiles.flatMap((tile) =>
    [
      ...tile.querySelectorAll<HTMLElement>(
        ".tile-title,.tile-copy small,.tile-emblem,.corner-emblem",
      ),
    ].map((e) => e.getBoundingClientRect()),
  );
  tiles.forEach((tile) => {
    const name = tile.getAttribute("title")!;
    const title = tile.querySelector<HTMLElement>(".tile-title")!;
    const copy = tile.querySelector<HTMLElement>(".tile-copy")!;
    const icon = tile.querySelector<HTMLElement>(
      ".tile-emblem,.corner-emblem",
    )!;
    const range = document.createRange();
    range.selectNodeContents(title);
    const text = range.getBoundingClientRect();
    const box = copy.getBoundingClientRect();
    if (title.scrollWidth > title.clientWidth + 1 || text.width > box.width + 2)
      failures.push(`${name}: title too wide`);
    if (
      title.clientHeight >
      parseFloat(getComputedStyle(title).lineHeight) * 2 + 1
    )
      failures.push(`${name}: more than two title lines`);
    const price = copy.querySelector("small");
    if (price && price.scrollWidth > price.clientWidth + 1)
      failures.push(`${name}: subtitle overflow`);
    if (copy.scrollHeight > tile.clientHeight - 2 + 1)
      failures.push(`${name}: content too tall`);
    if (intersects(text, icon.getBoundingClientRect()))
      failures.push(`${name}: icon/title overlap`);
    tile
      .querySelectorAll<HTMLElement>(
        ".piece-position,.tile-buildings,.tile-owner-marker,.mortgage-lock",
      )
      .forEach((marker) => {
        if (zones.some((z) => intersects(z, marker.getBoundingClientRect())))
          failures.push(`${name}: marker/content overlap`);
      });
  });
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
          <div ref={root} className="tabletop-scene">
            <div className="tabletop-plane campus-board">
              <div className="campus-lawn" />
              {campusBoard.map((b) => (
                <BoardTile
                  key={b.index}
                  index={b.index}
                  snapshot={snapshot}
                  occupants={stacked ? players : [players[b.index % 4]]}
                  onInspect={() => {}}
                  onDestination={() => {}}
                  canTravel={false}
                />
              ))}
            </div>
            <section className="tabletop-stage campus-center">
              <h2>All 40 spaces</h2>
              <p>
                Every space has a piece. Toggle four-piece stacks to test the
                edge anchors.
              </p>
              <strong>
                {failures.length
                  ? `${failures.length} layout issues`
                  : "All tile checks pass"}
              </strong>
            </section>
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
