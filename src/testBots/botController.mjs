// Imported ONLY by the loopback development server, never by game-api or React.
import { randomBytes, randomUUID } from "node:crypto";
import { chooseDecision } from "./botStrategy.mjs";
export class BotController {
  constructor({ db, rpc, enabled = false }) {
    this.db = db;
    this.rpc = rpc;
    this.enabled = enabled;
    this.rooms = new Map();
    this.creating = new Map();
    this.running = false;
  }
  async initialize() {
    if (!this.enabled) return;
    await this.db.pool.query(
      `create table campus_private.local_test_rooms(session text primary key,host uuid not null,bots uuid[] not null);`,
    );
  }
  annotate(s) {
    const r = this.rooms.get(s.room_session_id);
    return r
      ? {
          ...s,
          is_test_room: true,
          test_bots: { paused: r.paused, speed: r.speed },
          players: s.players.map((p) => ({
            ...p,
            is_bot: r.bots.some((b) => b.player_id === p.id),
          })),
        }
      : s;
  }
  async create(name, count, token) {
    if (this.creating.has(token)) return this.creating.get(token);
    const promise = this.createRoom(name, count, token);
    this.creating.set(token, promise);
    try {
      return await promise;
    } finally {
      this.creating.delete(token);
    }
  }
  async createRoom(name, count, token) {
    if (!this.enabled) throw Error("Local test bots are disabled");
    if (!Number.isInteger(count) || count < 1 || count > 3)
      throw Error("Choose 1–3 bots");
    // campus_enter is idempotent by human token, including an interrupted setup retry.
    const host = await this.rpc("campus_enter", {
      action: "create",
      code: randomBytes(3)
        .toString("hex")
        .toUpperCase()
        .replace(/0/g, "A")
        .replace(/1/g, "B"),
      name,
      token,
      rules: 2,
    });
    let r = this.rooms.get(host.room_session_id);
    if (!r) {
      r = {
        host: host.player_id,
        count,
        bots: [],
        paused: false,
        speed: "normal",
        due: 0,
      };
      this.rooms.set(host.room_session_id, r);
    }
    if (r.count !== count)
      throw Error(
        "Retry with the original bot count or create a new test room",
      );
    while (r.bots.length < count) {
      const i = r.bots.length,
        secret = randomBytes(32).toString("hex");
      const b = await this.rpc("campus_enter", {
        action: "join",
        code: host.room_code,
        name: ["Bot Alex", "Bot Jordan", "Bot Sam"][i],
        token: secret,
        rules: 2,
      });
      r.bots.push({ ...b, token: secret });
    }
    await this.db.pool.query(
      "insert into campus_private.local_test_rooms values($1,$2,$3) on conflict(session) do update set bots=excluded.bots",
      [host.room_session_id, host.player_id, r.bots.map((b) => b.player_id)],
    );
    return {
      ...host,
      snapshot: this.annotate(await this.snapshot(host.room_session_id)),
    };
  }
  async snapshot(session) {
    return (
      await this.db.pool.query(
        "select campus_private.snapshot(id) s from campus_private.rooms where room_session_id=$1",
        [session],
      )
    ).rows[0]?.s;
  }
  async control(body) {
    if (!this.enabled) throw Error("Local test bots are disabled");
    const r = this.rooms.get(body.room_session_id);
    if (!r || body.player_id !== r.host) throw Error("Test room host required");
    await this.rpc("campus_action", {
      session: body.room_session_id,
      player: body.player_id,
      token: body.player_token,
      action: "sync",
      request: randomUUID(),
      revision: 0,
      payload: {},
    });
    if (body.command === "pause") r.paused = true;
    else if (body.command === "resume") r.paused = false;
    else if (body.command === "skip-delay") r.due = 0;
    else if (
      body.command === "speed" &&
      ["normal", "fast", "instant"].includes(body.speed)
    )
      r.speed = body.speed;
    else if (body.command === "reset") {
      const token = randomBytes(32).toString("hex");
      r.paused = true;
      const s = await this.snapshot(body.room_session_id);
      return {
        ...(await this.create(
          s.players.find((p) => p.id === r.host).name,
          r.bots.length,
          token,
        )),
        player_token: token,
      };
    } else throw Error("Invalid test control");
    return {
      snapshot: this.annotate(await this.snapshot(body.room_session_id)),
    };
  }
  async tick(now = Date.now()) {
    if (!this.enabled || this.running) return;
    this.running = true;
    try {
      for (const [session, r] of this.rooms) {
        if (r.paused || now < r.due) continue;
        let s = await this.snapshot(session);
        if (!s || s.status !== "active") continue;
        let b, d;
        for (const bot of [...r.bots].sort((a, b) =>
          a.player_id === s.current_player_id
            ? -1
            : b.player_id === s.current_player_id
              ? 1
              : 0,
        )) {
          const p = s.players.find((p) => p.id === bot.player_id);
          d = chooseDecision(s, p);
          if (d) {
            b = bot;
            break;
          }
        }
        // Auction settlement / inactivity is the existing idempotent deadline action.
        if (!d && s.turn_ends_at && Date.parse(s.turn_ends_at) <= now) {
          b = r.bots.find(
            (b) => !s.players.find((p) => p.id === b.player_id).bankrupt,
          );
          d = { action: "advance-turn" };
        }
        if (!b || !d) continue;
        try {
          await this.rpc("campus_action", {
            session,
            player: b.player_id,
            token: b.token,
            action: d.action,
            request: randomUUID(),
            revision: s.revision,
            payload: d.payload || {},
          });
        } catch (e) {
          if (e.code !== "P0001") throw e;
          // A once-valid offer may have changed since it was made. Decline it rather than loop forever.
          if (d.action === "trade-accept") {
            s = await this.snapshot(session);
            await this.rpc("campus_action", {
              session,
              player: b.player_id,
              token: b.token,
              action: "trade-decline",
              request: randomUUID(),
              revision: s.revision,
              payload: d.payload,
            }).catch((e) => {
              if (e.code !== "P0001") throw e;
            });
          }
        }
        r.due = now + { normal: 750, fast: 150, instant: 10 }[r.speed];
      }
    } finally {
      this.running = false;
    }
  }
}
