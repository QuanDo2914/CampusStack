import { before, test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
let ui;
before(async () => {
  const result = await build({
    stdin: {
      contents: `export {createElement} from 'react';export {renderToStaticMarkup} from 'react-dom/server';export {ExpandedGame} from './src/components/expanded/GameScreen';export {PropertyCard} from './src/components/expanded/PropertyCard';export {VictoryScreen} from './src/components/expanded/VictoryScreen';`,
      resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    banner: {
      js: `import {createRequire} from 'node:module';const require=createRequire(${JSON.stringify(new URL("./ui.test.mjs", import.meta.url).pathname)});`,
    },
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  ui = await import(
    "data:text/javascript;base64," +
      Buffer.from(result.outputFiles[0].text).toString("base64")
  );
});
const players = [
  {
    id: "p1",
    name: "Quan",
    seat: 0,
    cash: 1500,
    position: 0,
    character: "runner",
    last_seen_at: new Date().toISOString(),
    achievements: [],
  },
  {
    id: "p2",
    name: "Alex",
    seat: 1,
    cash: 1500,
    position: 0,
    character: "robot",
    last_seen_at: new Date().toISOString(),
    achievements: [],
  },
];
const base = {
  rules_version: 2,
  room_session_id: "test",
  status: "active",
  host_player_id: "p1",
  revision: 1,
  current_player_id: "p1",
  phase: "awaiting_roll",
  pending_property: null,
  last_die: null,
  match_ends_at: null,
  turn_ends_at: null,
  players,
  ownership: {},
  assets: {},
  trades: [],
  events: [],
};
function render(snapshot = base) {
  return ui.renderToStaticMarkup(
    ui.createElement(ui.ExpandedGame, {
      snapshot,
      session: { player_id: "p1" },
      busy: false,
      connected: true,
      turnSeconds: 30,
      offset: 0,
      onAction: () => {},
    }),
  );
}
test("fresh expanded game renders all 40 spaces and controls without any owned assets", () => {
  const html = render();
  assert.equal((html.match(/data-testid="space-/g) || []).length, 40);
  assert.match(html, /Roll Dice/);
  assert.match(html, /0% best side/);
  assert.match(html, /Airport/);
});
test("purchase, debt, Airport, event choice and auction phases render valid action controls", () => {
  for (const [phase, extra, expected] of [
    ["awaiting_purchase", { pending_property: 5 }, "Buy"],
    [
      "debt",
      { debt: { player: "p1", amount: 2000, creditor: "p2" } },
      "Pay debt",
    ],
    ["airport", {}, "Choose your destination"],
    [
      "event_choice",
      {
        active_event: {
          id: 26,
          name: "Renovation Grant",
          kind: "upgrade",
          value: 0,
          icon: "🎴",
          description: "Free upgrade",
        },
      },
      "Skip grant",
    ],
    [
      "auction",
      {
        auction: {
          space: 5,
          bid: 50,
          bidder: "p2",
          ends_at: new Date().toISOString(),
        },
      },
      "Place bid",
    ],
  ]) {
    assert.match(render({ ...base, phase, ...extra }), new RegExp(expected));
  }
  const auction = render({
    ...base,
    phase: "auction",
    auction: {
      space: 5,
      bid: 50,
      bidder: "p2",
      ends_at: new Date().toISOString(),
    },
  });
  const ids = [...auction.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(
    new Set(ids).size,
    ids.length,
    "mobile/desktop auction controls have unique labels",
  );
});
test("mortgaged property shows zero current rent and all four victory types render", () => {
  const s = {
    ...base,
    assets: { 1: { owner: "p1", level: 0, mortgaged: true } },
  };
  const html = ui.renderToStaticMarkup(
    ui.createElement(ui.PropertyCard, {
      snapshot: s,
      index: 1,
      onClose: () => {},
    }),
  );
  assert.match(html, /Current rent <strong>\$0<\/strong>/);
  for (const type of [
    "LAST_PLAYER_STANDING",
    "STRAIGHT_LINE",
    "TRANSIT_MONOPOLY",
    "PROPERTY_EMPIRE",
  ])
    assert.match(
      ui.renderToStaticMarkup(
        ui.createElement(ui.VictoryScreen, {
          snapshot: {
            ...s,
            status: "finished",
            winner: { winnerId: "p1", type, side: 0 },
          },
          onHome: () => {},
        }),
      ),
      /Quan.*wins/,
    );
});

test("tabletop preserves full accessible tile names, shared occupants, mortgages and Landmark development", () => {
  const html = render({
    ...base,
    assets: {
      1: { owner: "p1", level: 5, mortgaged: false },
      2: { owner: "p1", level: 0, mortgaged: true },
    },
    players: players.map((p) => ({ ...p, position: 1 })),
  });
  assert.match(html, /Engineering Cafe, owned by Quan/);
  assert.match(html, /Green Street Pizza, owned by Quan, mortgaged/);
  assert.match(html, /Quan at Engineering Cafe/);
  assert.match(html, /Alex at Engineering Cafe/);
  assert.match(html, /5 development levels/);
  assert.match(html, /corner-face/);
  assert.match(html, /Fast Travel/);
  assert.ok(!html.includes("FLY ANYWHERE"));
  assert.match(html, /Mortgaged/);
  assert.match(html, /rail-compact-meta/);
  assert.match(html, /Student Apts/);
  assert.match(html, /Observatory/);
  assert.equal(
    (html.match(/data-edge="(top|bottom|left|right)"/g) || []).length,
    40,
  );
  assert.equal((html.match(/class="tile-title"/g) || []).length, 40);
  assert.equal((html.match(/data-testid="space-/g) || []).length, 40);
  assert.ok(
    !html.includes("board-character"),
    "board tokens use original vector pieces",
  );
});
