import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { database } from "./database.mjs";
const board = JSON.parse(
  await readFile(new URL("../src/data/board.json", import.meta.url)),
);
let db;
let count = 0;
before(async () => (db = await database({ modern: true })));
after(async () => db?.stop());
async function room(n = 2) {
  const code =
    "UP" +
    String(++count)
      .padStart(4, "0")
      .split("")
      .map((d) => "ABCDEFGHJK"[Number(d)])
      .join("");
  const ps = [];
  for (let i = 0; i < n; i++) {
    const token = randomBytes(32).toString("hex");
    ps.push({
      ...(await db.rpc("campus_enter", {
        action: i ? "join" : "create",
        code,
        name: "Player " + i,
        token,
      })),
      token,
    });
  }
  await act(ps[0], "start");
  return ps;
}
async function snap(p) {
  return (
    await db.pool.query(
      "select campus_private.snapshot(id) s from campus_private.rooms where room_session_id=$1",
      [p.room_session_id],
    )
  ).rows[0].s;
}
async function act(p, action, payload = {}, id = randomUUID(), revision) {
  const s = await snap(p);
  return db.rpc("campus_action", {
    session: p.room_session_id,
    player: p.player_id,
    token: p.token,
    action,
    request: id,
    revision: revision ?? s.revision,
    payload,
  });
}
async function state(p, sql, args = []) {
  return db.pool.query(
    sql +
      " where room_id=(select id from campus_private.rooms where room_session_id=$1)",
    [p.room_session_id, ...args],
  );
}
async function position(p, n) {
  await db.pool.query(
    "update campus_private.players set position=$1 where id=$2",
    [n, p.player_id],
  );
}
async function assets(p, indices, level = 0) {
  for (const i of indices)
    await db.pool.query(
      "insert into campus_private.assets(room_id,space,owner,level) select id,$2,$3,$4 from campus_private.rooms where room_session_id=$1 on conflict(room_id,space) do update set owner=excluded.owner,level=excluded.level",
      [p.room_session_id, i, p.player_id, level],
    );
}
async function resolve(p, n) {
  await position(p, n);
  await db.pool.query(
    "select campus_private.resolve_v2((select id from campus_private.rooms where room_session_id=$1),$2)",
    [p.room_session_id, p.player_id],
  );
}
async function victory(p) {
  return (
    await db.pool.query(
      "select campus_private.check_victory(id) v from campus_private.rooms where room_session_id=$1",
      [p.room_session_id],
    )
  ).rows[0].v;
}
async function seededRoll(p, want) {
  const c = await db.pool.connect();
  try {
    let seed;
    for (let i = 0; i < 2000; i++) {
      seed = i / 2000;
      await c.query("select setseed($1)", [seed]);
      const r = await c.query(
        "select floor(random()*6)::integer+1 d1,floor(random()*6)::integer+1 d2",
      );
      if (want(r.rows[0].d1, r.rows[0].d2)) break;
    }
    const s = (
      await c.query(
        "select campus_private.snapshot(id) s from campus_private.rooms where room_session_id=$1",
        [p.room_session_id],
      )
    ).rows[0].s;
    await c.query("select setseed($1)", [seed]);
    return (
      await c.query(
        "select public.campus_action($1,$2,$3,$4,$5,$6,$7) result",
        [
          p.room_session_id,
          p.player_id,
          p.token,
          "roll",
          randomUUID(),
          s.revision,
          {},
        ],
      )
    ).rows[0].result.snapshot;
  } finally {
    c.release();
  }
}
test("board source has exactly four corners, four stations and eight complete groups", () => {
  assert.equal(board.length, 40);
  assert.deepEqual(
    [0, 10, 20, 30].map((i) => board[i].kind),
    ["start", "airport", "go_to_jail", "jail"],
  );
  assert.equal(board.filter((s) => s.kind === "station").length, 4);
  const groups = Object.groupBy(
    board.filter((s) => s.kind === "property"),
    (s) => s.category,
  );
  assert.equal(Object.keys(groups).length, 8);
  assert.ok(Object.values(groups).every((g) => g.length === 3));
});
test("character selection is unique and new joins get an available token", async () => {
  const ps = await room();
  await act(ps[0], "character").catch(() => {});
  await assert.rejects(
    () => act(ps[0], "character", { character: "cyclist" }),
    /before the match/,
  );
  const s = await snap(ps[0]);
  assert.notEqual(s.players[0].character, s.players[1].character);
  const token = randomBytes(32).toString("hex");
  const h = {
    ...(await db.rpc("campus_enter", {
      action: "create",
      code: "CHAR23",
      name: "Host",
      token,
    })),
    token,
  };
  await act(h, "character", { character: "cyclist" });
  const g = {
    ...(await db.rpc("campus_enter", {
      action: "join",
      code: "CHAR23",
      name: "Guest",
      token: randomBytes(32).toString("hex"),
    })),
  };
  assert.notEqual(
    g.snapshot.players[0].character,
    g.snapshot.players[1].character,
  );
  await assert.rejects(
    () => act(h, "character", { character: g.snapshot.players[1].character }),
    /already taken/,
  );
});
test("two dice move their sum; duplicate roll and different payload reuse are safe", async () => {
  const [p, g] = await room();
  await assert.rejects(() => act(g, "roll"), /not your turn/);
  const id = randomUUID();
  const a = await act(p, "roll", {}, id);
  const b = await act(p, "roll", {}, id);
  assert.equal(a.snapshot.dice.length, 2);
  assert.ok(a.snapshot.dice.every((d) => d >= 1 && d <= 6));
  assert.equal(b.snapshot.players[0].position, a.snapshot.players[0].position);
  assert.equal(
    b.snapshot.events.filter((e) => / rolled /.test(e.message)).length,
    1,
  );
  await assert.rejects(
    () => act(p, "roll", { other: true }, id),
    /already used/,
  );
});
test("doubles allow another roll after resolution; third consecutive doubles goes to Jail", async () => {
  const [p] = await room();
  let s = await seededRoll(p, (a, b) => a === b && a === 1);
  assert.equal(s.extra_roll, true);
  await act(p, "buy");
  s = await snap(p);
  assert.equal(s.phase, "awaiting_roll");
  await state(
    p,
    "update campus_private.game_state set doubles=2,phase='awaiting_roll'",
  );
  s = await seededRoll(p, (a, b) => a === b);
  assert.equal(s.players[0].jailed, true);
  assert.equal(s.players[0].position, 30);
  assert.notEqual(s.current_player_id, p.player_id);
});
test("START crossing and exact landing each award salary exactly once", async () => {
  for (const pos of [38, 39]) {
    const [p] = await room();
    await position(p, pos);
    const s = await seededRoll(p, (a, b) => a === 1 && b === 1);
    assert.equal(s.players[0].cash, 1600);
    assert.equal(s.players[0].position, (pos + 2) % 40);
    assert.equal(
      s.events.filter((e) => /collected \$100/.test(e.message)).length,
      1,
    );
  }
});
test("buy is validated, rent pays correct amount, own and mortgaged assets collect no rent", async () => {
  const [p, g] = await room();
  await resolve(p, 1);
  const s = (await act(p, "buy")).snapshot;
  assert.equal(s.assets[1].owner, p.player_id);
  assert.equal(s.players[0].cash, 1360);
  await assert.rejects(() => act(p, "buy"), /No purchase/);
  await resolve(g, 1);
  assert.equal((await snap(p)).players[1].cash, 1480);
  await act(p, "mortgage", { space: 1 });
  await resolve(g, 1);
  assert.equal((await snap(p)).players[1].cash, 1480);
});
test("complete groups unlock upgrades with even building, rent scaling and mortgage restrictions", async () => {
  const [p] = await room();
  const ids = board.filter((b) => b.category === "food").map((b) => b.index);
  await assets(p, [ids[0]]);
  await assert.rejects(() => act(p, "upgrade", { space: ids[0] }), /complete/);
  await assets(p, ids);
  await act(p, "upgrade", { space: ids[0] });
  await assert.rejects(() => act(p, "upgrade", { space: ids[0] }), /evenly/);
  await assert.rejects(
    () => act(p, "mortgage", { space: ids[1] }),
    /Sell all upgrades/,
  );
  assert.equal(
    (
      await db.pool.query(
        "select campus_private.rent_v2((select id from campus_private.rooms where room_session_id=$1),$2) rent",
        [p.room_session_id, ids[0]],
      )
    ).rows[0].rent,
    60,
  );
  await act(p, "downgrade", { space: ids[0] });
  await act(p, "mortgage", { space: ids[0] });
  await assert.rejects(
    () => act(p, "upgrade", { space: ids[1] }),
    /unmortgaged/,
  );
  await act(p, "unmortgage", { space: ids[0] });
  assert.equal((await snap(p)).assets[ids[0]].mortgaged, false);
});
test("station rent scales by ownership; buying all four causes one Transit victory", async () => {
  const [p] = await room();
  for (const [n, i] of [5, 15, 25].entries()) {
    await assets(p, [i]);
    const rent = (
      await db.pool.query(
        "select campus_private.rent_v2((select id from campus_private.rooms where room_session_id=$1),5) rent",
        [p.room_session_id],
      )
    ).rows[0].rent;
    assert.equal(rent, 25 * 2 ** n);
  }
  await resolve(p, 35);
  const id = randomUUID();
  let s = (await act(p, "buy", {}, id)).snapshot;
  assert.equal(s.winner.type, "TRANSIT_MONOPOLY");
  s = (await act(p, "buy", {}, id)).snapshot;
  assert.equal(s.events.filter((e) => /WINS:/.test(e.message)).length, 1);
  await assert.rejects(() => act(p, "roll"), /not active/);
  await assert.rejects(() => act(p, "trade-offer"), /not active/);
});
test("Straight Line requires every purchasable side space including station; specials ignored", async () => {
  const [p] = await room();
  const side = board
    .filter((s) => s.side === 0 && ["property", "station"].includes(s.kind))
    .map((s) => s.index);
  await assets(p, side.slice(1));
  assert.equal(await victory(p), null);
  await assets(p, [side[0]]);
  const v = await victory(p);
  assert.equal(v.type, "STRAIGHT_LINE");
  assert.equal(v.side, 0);
});
test("Property Empire needs three complete sets and two fully developed sets", async () => {
  const [p] = await room();
  const groups = ["food", "arts", "science"].map((cat) =>
    board.filter((b) => b.category === cat).map((b) => b.index),
  );
  for (const ids of groups) await assets(p, ids);
  assert.equal(await victory(p), null);
  await assets(p, groups[0], 5);
  assert.equal(await victory(p), null);
  await assets(p, groups[1], 5);
  assert.equal((await victory(p)).type, "PROPERTY_EMPIRE");
  const [q] = await room();
  await assets(q, groups[0], 5);
  await assets(q, groups[1], 5);
  assert.equal(await victory(q), null);
});
test("Airport destinations resolve purchases/rent/events/Jail; teleport START never pays", async () => {
  const [p, g] = await room();
  await resolve(p, 10);
  let s = (await act(p, "travel", { destination: 0 })).snapshot;
  assert.equal(s.players[0].cash, 1500);
  assert.equal(s.players[0].position, 0);
  await resolve(p, 10);
  s = (await act(p, "travel", { destination: 5 })).snapshot;
  assert.equal(s.phase, "awaiting_purchase");
  assert.equal(s.assets[5], undefined);
  await act(p, "buy");
  await assets(g, [11]);
  await resolve(p, 10);
  s = (await act(p, "travel", { destination: 11 })).snapshot;
  assert.equal(s.players[1].cash, 1530);
  await resolve(p, 10);
  await assert.rejects(
    () => act(p, "travel", { destination: 10 }),
    /another valid/,
  );
  await assert.rejects(
    () => act(p, "travel", { destination: 40 }),
    /another valid/,
  );
  s = (await act(p, "travel", { destination: 20 })).snapshot;
  assert.equal(s.players[0].jailed, true);
});
test("Jail failed rolls, doubles release, pass, payment and visiting are distinct", async () => {
  const [p] = await room();
  await db.pool.query(
    "update campus_private.players set jailed=true,position=30 where id=$1",
    [p.player_id],
  );
  let s = await seededRoll(p, (a, b) => a !== b);
  assert.equal(s.players[0].jail_attempts, 1);
  assert.equal(s.players[0].jailed, true);
  await state(
    p,
    "update campus_private.game_state set current_player_id=$2,phase='awaiting_roll'",
    [p.player_id],
  );
  s = await seededRoll(p, (a, b) => a === b);
  assert.equal(s.players[0].jailed, false);
  assert.equal(s.extra_roll, false);
  await db.pool.query(
    "update campus_private.players set jailed=true,passes=1 where id=$1",
    [p.player_id],
  );
  await state(
    p,
    "update campus_private.game_state set current_player_id=$2,phase='awaiting_roll'",
    [p.player_id],
  );
  await act(p, "jail-pass");
  assert.equal((await snap(p)).players[0].passes, 0);
  await resolve(p, 30);
  assert.equal((await snap(p)).players[0].jailed, false);
});
test("auction bids validate cash and settle once after the authoritative deadline", async () => {
  const [p, g] = await room();
  await resolve(p, 1);
  await act(p, "skip");
  await assert.rejects(() => act(g, "bid", { amount: 1600 }), /available cash/);
  await act(g, "bid", { amount: 75 });
  await assert.rejects(() => act(p, "bid", { amount: 75 }), /above/);
  await state(
    p,
    "update campus_private.game_state set turn_ends_at=clock_timestamp()-interval '1 second'",
  );
  await Promise.all([act(p, "advance-turn"), act(g, "advance-turn")]);
  const s = await snap(p);
  assert.equal(s.assets[1].owner, g.player_id);
  assert.equal(s.players[1].cash, 1425);
  assert.equal(
    s.events.filter((e) => /won the auction/.test(e.message)).length,
    1,
  );
});
test("trades atomically transfer cash/assets, reject forged or stale assets and cannot execute twice", async () => {
  const [p, g] = await room();
  await assets(p, [1]);
  await assets(g, [5]);
  await assert.rejects(
    () =>
      act(p, "trade-offer", {
        recipient: g.player_id,
        give_spaces: [5],
        take_spaces: [],
        give_cash: 0,
        take_cash: 0,
      }),
    /not owned/,
  );
  await act(p, "trade-offer", {
    recipient: g.player_id,
    give_spaces: [1],
    take_spaces: [5],
    give_cash: 100,
    take_cash: 0,
  });
  const s = await snap(p);
  const id = randomUUID();
  await act(g, "trade-accept", { trade: s.trades[0].id }, id);
  await act(g, "trade-accept", { trade: s.trades[0].id }, id);
  let after = await snap(p);
  assert.equal(after.assets[1].owner, g.player_id);
  assert.equal(after.assets[5].owner, p.player_id);
  assert.equal(after.players[0].cash, 1400);
  assert.equal(after.players[1].cash, 1600);
  await act(p, "trade-offer", {
    recipient: g.player_id,
    give_spaces: [5],
    take_spaces: [],
    give_cash: 0,
    take_cash: 50,
  });
  const tr = (await snap(p)).trades[0];
  await act(p, "sell", { space: 5 });
  await assert.rejects(
    () => act(g, "trade-accept", { trade: tr.id }),
    /ownership changed/,
  );
});
test("debts allow mortgages/payment; bankruptcy transfers assets and last survivor wins", async () => {
  const [p, g] = await room();
  await assets(p, [1]);
  await assets(g, [5]);
  await db.pool.query("update campus_private.players set cash=0 where id=$1", [
    p.player_id,
  ]);
  await resolve(p, 5);
  assert.equal((await snap(p)).phase, "debt");
  assert.equal((await snap(p)).players[0].cash, 0);
  await act(p, "mortgage", { space: 1 });
  await act(p, "pay-debt");
  assert.equal((await snap(p)).players[0].cash, 45);
  await db.pool.query("update campus_private.players set cash=0 where id=$1", [
    p.player_id,
  ]);
  await resolve(p, 5);
  await act(p, "bankrupt");
  const s = await snap(p);
  assert.equal(s.players[0].bankrupt, true);
  assert.equal(s.assets[1].owner, g.player_id);
  assert.equal(s.winner.type, "LAST_PLAYER_STANDING");
  assert.equal(s.winner.winnerId, g.player_id);
});
test("bank bankruptcy returns assets and debt timeout first liquidates assets", async () => {
  const [p] = await room(3);
  await assets(p, [1]);
  await db.pool.query("update campus_private.players set cash=0 where id=$1", [
    p.player_id,
  ]);
  await resolve(p, 8);
  await state(
    p,
    "update campus_private.game_state set turn_ends_at=clock_timestamp()-interval '1 second'",
  );
  await act(p, "advance-turn");
  const s = await snap(p);
  assert.equal(s.players[0].bankrupt, true);
  assert.equal(s.assets[1], undefined);
  assert.equal(s.winner, null);
});
test("v2 does not award timer/net-worth victory and browser roles cannot invoke expanded actions", async () => {
  const [p] = await room();
  await state(
    p,
    "update campus_private.game_state set match_ends_at=clock_timestamp()-interval '1 second'",
  );
  assert.equal((await act(p, "finish-game")).snapshot.status, "active");
  const c = await db.pool.connect();
  try {
    await c.query("begin");
    await c.query("set local role anon");
    await assert.rejects(
      () =>
        c.query("select public.campus_action($1,$2,$3,$4,$5,$6,$7)", [
          p.room_session_id,
          p.player_id,
          p.token,
          "roll",
          randomUUID(),
          0,
          {},
        ]),
      /permission denied/,
    );
    await c.query("rollback");
  } finally {
    c.release();
  }
});
async function seededEvent(p, eventId) {
  const c = await db.pool.connect();
  try {
    let seed;
    for (let i = 0; i < 2000; i++) {
      seed = i / 2000;
      await c.query("select setseed($1)", [seed]);
      const r = await c.query("select floor(random()*30)::integer id");
      if (r.rows[0].id === eventId) break;
    }
    await c.query("update campus_private.players set position=3 where id=$1", [
      p.player_id,
    ]);
    await c.query("select setseed($1)", [seed]);
    await c.query(
      "select campus_private.resolve_v2((select id from campus_private.rooms where room_session_id=$1),$2)",
      [p.room_session_id, p.player_id],
    );
  } finally {
    c.release();
  }
  return snap(p);
}
test("all thirty event cards resolve server-side, with interactive choices and no negative cash", async () => {
  for (let id = 0; id < 30; id++) {
    const [p, g] = await room();
    await assets(
      p,
      board.filter((b) => b.category === "food").map((b) => b.index),
    );
    let s;
    try {
      s = await seededEvent(p, id);
    } catch (e) {
      throw new Error(`Event ${id}: ${e.message}; ${e.where || ""}`);
    }
    assert.ok(
      s.events.some((e) => e.message.startsWith("🎴")),
      `event ${id}`,
    );
    assert.ok(s.players.every((p) => p.cash >= 0));
    if (s.phase === "event_choice") {
      if (s.active_event.kind === "target") {
        s = (await act(p, "event-choice", { player: g.player_id })).snapshot;
        assert.equal(s.players[1].cash, 1600);
      } else {
        const prior = s.players[0].cash;
        s = (await act(p, "event-choice", { space: 1 })).snapshot;
        assert.equal(s.assets[1].level, 1);
        assert.equal(s.players[0].cash, prior);
      }
    }
  }
});
test("one-use rent protection and rent bonus are consumed exactly once", async () => {
  const [p, g] = await room();
  await assets(g, [5]);
  await db.pool.query(
    "update campus_private.players set shield=true where id=$1",
    [p.player_id],
  );
  await resolve(p, 5);
  assert.equal((await snap(p)).players[0].cash, 1500);
  assert.equal((await snap(p)).players[0].shield, false);
  await db.pool.query(
    "update campus_private.players set rent_bonus=true where id=$1",
    [g.player_id],
  );
  await resolve(p, 5);
  assert.equal((await snap(p)).players[0].cash, 1450);
  assert.equal((await snap(p)).players[1].rent_bonus, false);
  await resolve(p, 5);
  assert.equal((await snap(p)).players[0].cash, 1425);
});
test("Jail release dice crossing START pays once; unpaid third attempt waits for bail then moves", async () => {
  const [p] = await room();
  await db.pool.query(
    "update campus_private.players set jailed=true,position=30 where id=$1",
    [p.player_id],
  );
  let s = await seededRoll(p, (a, b) => a === 6 && b === 6);
  assert.equal(s.players[0].cash, 1600);
  assert.equal(s.players[0].position, 2);
  const [q] = await room();
  await db.pool.query(
    "update campus_private.players set jailed=true,jail_attempts=2,position=30,cash=0 where id=$1",
    [q.player_id],
  );
  s = await seededRoll(q, (a, b) => a === 6 && b === 5);
  assert.equal(s.phase, "debt");
  assert.equal(s.players[0].position, 30);
  await assets(q, [15]);
  await act(q, "mortgage", { space: 15 });
  s = (await act(q, "pay-debt")).snapshot;
  assert.equal(s.players[0].position, 1);
  assert.equal(s.players[0].cash, 150);
  assert.equal(s.players[0].jailed, false);
});
test("trades revalidate cash, support a counteroffer and check victory on acceptance", async () => {
  const [p, g] = await room();
  await assets(p, [5, 15, 25]);
  await assets(g, [35]);
  await act(p, "trade-offer", {
    recipient: g.player_id,
    give_spaces: [],
    take_spaces: [35],
    give_cash: 50,
    take_cash: 0,
  });
  let tr = (await snap(p)).trades[0];
  await act(g, "trade-counter", {
    trade: tr.id,
    recipient: p.player_id,
    give_spaces: [35],
    take_spaces: [],
    give_cash: 0,
    take_cash: 100,
  });
  tr = (await snap(p)).trades[0];
  await db.pool.query("update campus_private.players set cash=0 where id=$1", [
    p.player_id,
  ]);
  await assert.rejects(
    () => act(p, "trade-accept", { trade: tr.id }),
    /cash is no longer/,
  );
  await db.pool.query(
    "update campus_private.players set cash=1500 where id=$1",
    [p.player_id],
  );
  assert.equal(
    (await act(p, "trade-accept", { trade: tr.id })).snapshot.winner.type,
    "TRANSIT_MONOPOLY",
  );
});
test("stale revisions, forged property management and auction victory are validated", async () => {
  const [p, g] = await room();
  await assets(p, [5, 15, 25]);
  await assert.rejects(() => act(g, "mortgage", { space: 5 }), /not your turn/);
  await assert.rejects(() => act(p, "mortgage", { space: 35 }), /do not own/);
  const revision = (await snap(p)).revision;
  await act(p, "mortgage", { space: 5 });
  await assert.rejects(
    () => act(p, "roll", {}, randomUUID(), revision),
    /Board changed/,
  );
  await resolve(p, 35);
  await act(p, "skip");
  await act(p, "bid", { amount: 50 });
  await state(
    p,
    "update campus_private.game_state set turn_ends_at=clock_timestamp()-interval '1 second'",
  );
  assert.equal(
    (await act(g, "advance-turn")).snapshot.winner.type,
    "TRANSIT_MONOPOLY",
  );
});
test("migration preserves already active legacy rooms; v2 entry is opt-in and old clients are rejected from v2 rooms", async () => {
  const legacy = await database({ expanded: false });
  try {
    const token = randomBytes(32).toString("hex");
    const h = {
      ...(await legacy.rpc("campus_enter", {
        action: "create",
        code: "OLD234",
        name: "Old Host",
        token,
      })),
      token,
    };
    await legacy.rpc("campus_enter", {
      action: "join",
      code: "OLD234",
      name: "Old Guest",
      token: randomBytes(32).toString("hex"),
    });
    await legacy.rpc("campus_action", {
      session: h.room_session_id,
      player: h.player_id,
      token,
      action: "start",
      request: randomUUID(),
      revision: h.snapshot.revision,
    });
    for (const file of ["006_board_config.sql", "007_expanded_game.sql"])
      await legacy.pool.query(
        await readFile(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
    const result = await legacy.rpc("campus_action", {
      session: h.room_session_id,
      player: h.player_id,
      token,
      action: "sync",
      request: randomUUID(),
      revision: 0,
    });
    assert.equal(result.snapshot.status, "active");
    assert.equal(result.snapshot.rules_version, undefined);
    assert.ok(result.snapshot.match_ends_at);
    const modernToken = randomBytes(32).toString("hex");
    const m = await legacy.rpc("campus_enter", {
      action: "create",
      code: "NEW234",
      name: "Modern Host",
      token: modernToken,
      version: 2,
    });
    assert.equal(m.snapshot.rules_version, 2);
    await assert.rejects(
      () =>
        legacy.rpc("campus_enter", {
          action: "join",
          code: "NEW234",
          name: "Old Client",
          token: randomBytes(32).toString("hex"),
        }),
      /expanded rules/,
    );
  } finally {
    await legacy.stop();
  }
});
test("a pending trade cannot silently transfer a newly mortgaged asset", async () => {
  const [p, g] = await room();
  await assets(p, [1]);
  await act(p, "trade-offer", {
    recipient: g.player_id,
    give_spaces: [1],
    take_spaces: [],
    give_cash: 0,
    take_cash: 100,
  });
  const tr = (await snap(p)).trades[0];
  await act(p, "mortgage", { space: 1 });
  await assert.rejects(
    () => act(g, "trade-accept", { trade: tr.id }),
    /asset state changed/,
  );
  assert.equal((await snap(p)).assets[1].owner, p.player_id);
});
