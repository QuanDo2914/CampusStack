import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { BotController } from "../src/testBots/botController.mjs";
import {
  chooseDecision,
  chooseUpgrade,
  maxBid,
  evaluateTrade,
} from "../src/testBots/botStrategy.mjs";
import board from "../src/data/board.json" with { type: "json" };
import { database } from "./database.mjs";
let db, c;
before(async () => {
  db = await database({ modern: true });
  c = new BotController({ db, rpc: db.rpc, enabled: true });
  await c.initialize();
});
after(async () => db?.stop());
const secret = () => randomBytes(32).toString("hex");
async function create(n = 2) {
  return c.create("Human", n, secret());
}
async function act(h, action, payload = {}) {
  const s = await c.snapshot(h.room_session_id);
  return db.rpc("campus_action", {
    session: h.room_session_id,
    player: h.player_id,
    token: h.token,
    action,
    request: randomUUID(),
    revision: s.revision,
    payload,
  });
}
async function room(n = 2) {
  const token = secret(),
    h = { ...(await c.create("Human", n, token)), token };
  await act(h, "start");
  return h;
}
async function setBotTurn(h, phase = "awaiting_roll", pending = null) {
  const bot = c.rooms.get(h.room_session_id).bots[0];
  await db.pool.query(
    "update campus_private.game_state set current_player_id=$2,phase=$3,pending_property=$4,turn_ends_at=clock_timestamp()+interval '30 seconds' where room_id=(select id from campus_private.rooms where room_session_id=$1)",
    [h.room_session_id, bot.player_id, phase, pending],
  );
  return bot;
}
async function give(h, id, indices, level = 0) {
  for (const i of indices)
    await db.pool.query(
      "insert into campus_private.assets(room_id,space,owner,level) select id,$2,$3,$4 from campus_private.rooms where room_session_id=$1",
      [h.room_session_id, i, id, level],
    );
}
async function onlyTick(h) {
  for (const [key, r] of c.rooms) {
    r.paused = key !== h.room_session_id;
    if (!r.paused) r.due = 0;
  }
  await c.tick(Date.now() + 1000);
}

test("local bot setup supports 1/2/3, stores explicit identity and unique characters; entry retry is idempotent", async () => {
  for (const n of [1, 2, 3]) {
    const token = secret(),
      h = await c.create("Human", n, token),
      s = h.snapshot;
    assert.equal(s.players.length, n + 1);
    assert.equal(s.is_test_room, true);
    assert.equal(s.players.filter((p) => p.is_bot).length, n);
    assert.equal(new Set(s.players.map((p) => p.character)).size, n + 1);
    assert.equal((await c.create("Human", n, token)).player_id, h.player_id);
    const r = await db.pool.query(
      "select bots from campus_private.local_test_rooms where session=$1",
      [h.room_session_id],
    );
    assert.equal(r.rows[0].bots.length, n);
  }
});
test("bot automatically rolls through the normal transactional action", async () => {
  const h = await room(1);
  await setBotTurn(h);
  const before = await c.snapshot(h.room_session_id);
  await onlyTick(h);
  const after = await c.snapshot(h.room_session_id);
  assert.ok(after.revision > before.revision);
  assert.equal(after.dice.length, 2);
});
test("purchase keeps reserve, skips unsafe spending, and affordable buy uses server rules", async () => {
  const h = await room(1),
    b = await setBotTurn(h, "awaiting_purchase", 1);
  await onlyTick(h);
  assert.equal(
    (await c.snapshot(h.room_session_id)).assets[1].owner,
    b.player_id,
  );
  const s = {
    status: "active",
    phase: "awaiting_purchase",
    current_player_id: "b",
    pending_property: 2,
    assets: {},
  };
  assert.equal(chooseDecision(s, { id: "b", cash: 400 }).action, "skip");
  assert.equal(chooseDecision(s, { id: "b", cash: 1500 }).action, "buy");
});
test("auction bids are deterministic, capped, affordable and stop at valuation", () => {
  const p = { id: "b", cash: 600 },
    s = {
      status: "active",
      phase: "auction",
      assets: {},
      auction: { space: 5, bid: 0, bidder: null },
    };
  const cap = maxBid(s, p, 5, 12);
  assert.equal(cap, maxBid(s, p, 5, 12));
  assert.ok(cap <= 300);
  assert.ok(chooseDecision(s, p).payload.amount <= p.cash);
  s.auction.bid = cap + 30;
  assert.equal(chooseDecision(s, p, 12), null);
});
test("Airport uses a legal strategic unowned destination and Jail uses pass, bail or doubles", () => {
  const s = {
    status: "active",
    phase: "airport",
    current_player_id: "b",
    assets: {},
  };
  const p = { id: "b", cash: 1500, jailed: true };
  const d = chooseDecision(s, p);
  assert.ok(
    d.payload.destination !== 10 &&
      d.payload.destination >= 0 &&
      d.payload.destination < 40,
  );
  s.phase = "awaiting_roll";
  assert.equal(chooseDecision(s, { ...p, passes: 1 }).action, "jail-pass");
  assert.equal(chooseDecision(s, p).action, "jail-pay");
  assert.equal(chooseDecision(s, { ...p, cash: 40 }).action, "roll");
});
test("upgrades build evenly; debt sells upgrades then mortgages then bankrupts", () => {
  const p = { id: "b", cash: 800 };
  const indices = board
    .filter((b) => b.category === "food")
    .map((b) => b.index);
  const s = {
    status: "active",
    current_player_id: "b",
    phase: "management",
    assets: Object.fromEntries(
      indices.map((i) => [i, { owner: "b", level: 0, mortgaged: false }]),
    ),
  };
  const i = chooseUpgrade(s, p);
  assert.ok(indices.includes(i));
  s.assets[i].level = 1;
  assert.notEqual(chooseUpgrade(s, p), i);
  s.phase = "debt";
  s.debt = { amount: 900 };
  assert.equal(chooseDecision(s, p).action, "downgrade");
  s.assets[i].level = 0;
  assert.equal(chooseDecision(s, p).action, "mortgage");
  s.assets = {};
  assert.equal(chooseDecision(s, p).action, "bankrupt");
  assert.equal(chooseDecision(s, { ...p, cash: 1000 }).action, "pay-debt");
});
test("bot recovers debt by legal server actions and pays it without stalling", async () => {
  const h = await room(1),
    b = await setBotTurn(h);
  await give(h, b.player_id, [1]);
  await db.pool.query("update campus_private.players set cash=0 where id=$1", [
    b.player_id,
  ]);
  await db.pool.query(
    "select campus_private.charge_v2((select id from campus_private.rooms where room_session_id=$1),$2,null,50)",
    [h.room_session_id, b.player_id],
  );
  await onlyTick(h);
  assert.equal((await c.snapshot(h.room_session_id)).assets[1].mortgaged, true);
  await onlyTick(h);
  assert.equal((await c.snapshot(h.room_session_id)).debt, null);
});
test("bot trade valuation rejects an immediate fourth-station or side victory and responds automatically", async () => {
  const h = await room(1),
    b = await setBotTurn(h);
  await give(h, h.player_id, [5, 15, 25]);
  await give(h, b.player_id, [35]);
  const s = await c.snapshot(h.room_session_id),
    p = s.players.find((p) => p.id === b.player_id);
  const t = {
    sender: h.player_id,
    recipient: p.id,
    give_spaces: [],
    take_spaces: [35],
    give_cash: 1000,
    take_cash: 0,
  };
  assert.equal(evaluateTrade(s, p, t), false);
  await act(h, "trade-offer", t);
  await onlyTick(h);
  assert.equal((await c.snapshot(h.room_session_id)).trades.length, 0);
});
test("bot can win all four conditions through the same evaluator and normal victory snapshot", async () => {
  for (const type of [
    "LAST_PLAYER_STANDING",
    "TRANSIT_MONOPOLY",
    "STRAIGHT_LINE",
    "PROPERTY_EMPIRE",
  ]) {
    const h = await room(1),
      b = await setBotTurn(h, "management");
    if (type === "LAST_PLAYER_STANDING") {
      await db.pool.query(
        "update campus_private.game_state set current_player_id=$2 where room_id=(select id from campus_private.rooms where room_session_id=$1)",
        [h.room_session_id, h.player_id],
      );
      await db.pool.query(
        "select campus_private.charge_v2((select id from campus_private.rooms where room_session_id=$1),$2,null,9999)",
        [h.room_session_id, h.player_id],
      );
      await act(h, "bankrupt");
    } else {
      if (type === "TRANSIT_MONOPOLY")
        await give(h, b.player_id, [5, 15, 25, 35]);
      if (type === "STRAIGHT_LINE")
        await give(
          h,
          b.player_id,
          board
            .filter(
              (b) => b.side === 0 && ["property", "station"].includes(b.kind),
            )
            .map((b) => b.index),
        );
      if (type === "PROPERTY_EMPIRE") {
        await give(
          h,
          b.player_id,
          board
            .filter((b) => ["food", "wellness", "arts"].includes(b.category))
            .map((b) => b.index),
          5,
        );
      }
      await onlyTick(h);
    }
    const s = await c.snapshot(h.room_session_id);
    assert.equal(s.status, "finished");
    assert.equal(s.winner.winnerId, b.player_id);
    assert.equal(s.winner.type, type);
  }
});
test("debug controls authenticate host, pause, resume, speed and reset into a new normal lobby", async () => {
  const token = secret(),
    h = await c.create("Human", 2, token),
    body = {
      room_session_id: h.room_session_id,
      player_id: h.player_id,
      player_token: token,
    };
  await assert.rejects(
    c.control({ ...body, player_token: secret(), command: "pause" }),
  );
  assert.equal(
    (await c.control({ ...body, command: "pause" })).snapshot.test_bots.paused,
    true,
  );
  await c.control({ ...body, command: "speed", speed: "instant" });
  assert.equal(
    (await c.control({ ...body, command: "resume" })).snapshot.test_bots.speed,
    "instant",
  );
  const r = await c.control({ ...body, command: "reset" });
  assert.notEqual(r.room_session_id, h.room_session_id);
  assert.equal(r.snapshot.players.length, 3);
  assert.equal(r.snapshot.status, "lobby");
});
test("disabled controller rejects creation/debug; public handler has no test endpoint; normal rooms are unchanged", async () => {
  const off = new BotController({ db, rpc: db.rpc });
  await assert.rejects(off.create("Human", 2, secret()), /disabled/);
  await assert.rejects(off.control({}), /disabled/);
  const token = secret(),
    h = await db.rpc("campus_enter", {
      action: "create",
      code: "ZZABCD",
      name: "Normal",
      token,
      rules: 2,
    });
  assert.equal(c.annotate(h.snapshot).is_test_room, undefined);
  const handler = await readFile(
    new URL("../supabase/functions/game-api/handler.mjs", import.meta.url),
    "utf8",
  );
  assert.ok(!handler.includes("test-bots"));
});
test("production bundle excludes bot UI/controller even with the flag enabled", async () => {
  const { build } = await import("esbuild");
  for (const flag of ["false", "true"]) {
    const r = await build({
      entryPoints: ["src/App.tsx"],
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
      jsx: "automatic",
      minify: true,
      external: ["react", "react-dom", "@supabase/supabase-js"],
      define: {
        "import.meta.env.DEV": "false",
        "import.meta.env.VITE_ENABLE_TEST_BOTS": JSON.stringify(flag),
        "import.meta.env.VITE_LOCAL_SERVER_URL": "undefined",
        "import.meta.env.VITE_SUPABASE_URL": '"https://example.supabase.co"',
        "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '"publishable"',
      },
    });
    const js = r.outputFiles[0].text;
    assert.ok(!js.includes("VS COMPUTER"));
    assert.ok(!js.includes("Local test controls"));
    assert.ok(!js.includes("BotController"));
  }
});

test("Airport, Jail, upgrades and event choices use valid server actions", async () => {
  const h = await room(1),
    b = await setBotTurn(h, "airport");
  await onlyTick(h);
  let s = await c.snapshot(h.room_session_id);
  assert.notEqual(s.players.find((p) => p.id === b.player_id).position, 10);
  assert.equal(s.phase, "awaiting_purchase");
  await onlyTick(h);
  await setBotTurn(h);
  await db.pool.query(
    "update campus_private.players set jailed=true,passes=1,position=30 where id=$1",
    [b.player_id],
  );
  await onlyTick(h);
  s = await c.snapshot(h.room_session_id);
  assert.equal(s.players.find((p) => p.id === b.player_id).jailed, false);
  const q = await room(1),
    bot = await setBotTurn(q, "management");
  const ids = board.filter((x) => x.category === "food").map((x) => x.index);
  await give(q, bot.player_id, ids);
  await onlyTick(q);
  s = await c.snapshot(q.room_session_id);
  assert.equal(
    Object.values(s.assets).reduce((n, a) => n + a.level, 0),
    1,
  );
  await db.pool.query(
    `update campus_private.game_state set phase='event_choice',active_event='{"kind":"upgrade"}' where room_id=(select id from campus_private.rooms where room_session_id=$1)`,
    [q.room_session_id],
  );
  await onlyTick(q);
  s = await c.snapshot(q.room_session_id);
  assert.notEqual(s.phase, "event_choice");
});
test("auction controller finishes bidding at finite caps, and insolvent bots bankrupt normally", async () => {
  const h = await room(2);
  await setBotTurn(h, "awaiting_purchase", 5);
  await db.pool.query("update campus_private.players set cash=0 where id=$1", [
    c.rooms.get(h.room_session_id).bots[0].player_id,
  ]);
  await onlyTick(h);
  assert.equal((await c.snapshot(h.room_session_id)).phase, "auction");
  for (let i = 0; i < 60; i++) await onlyTick(h);
  const s = await c.snapshot(h.room_session_id),
    rev = s.revision;
  await onlyTick(h);
  assert.equal((await c.snapshot(h.room_session_id)).revision, rev);
  assert.ok(s.auction.bid <= 1200);
  const q = await room(1),
    b = await setBotTurn(q);
  await db.pool.query(
    "select campus_private.charge_v2((select id from campus_private.rooms where room_session_id=$1),$2,null,9999)",
    [q.room_session_id, b.player_id],
  );
  await onlyTick(q);
  const done = await c.snapshot(q.room_session_id);
  assert.equal(done.players.find((p) => p.id === b.player_id).bankrupt, true);
  assert.equal(done.winner.winnerId, q.player_id);
});
