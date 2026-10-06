// Development-only transport. Production uses Supabase Edge Functions + Realtime.
import http from "node:http";
import { BotController } from "../src/testBots/botController.mjs";
import { randomBytes } from "node:crypto";
import { jwtVerify } from "jose";
import { database } from "./database.mjs";
import { makeHandler } from "../supabase/functions/game-api/handler.mjs";
const db = await database({ modern: process.env.CAMPUS_LEGACY_TEST !== "1" });
const signingSecret = randomBytes(32).toString("hex");
const streams = new Map();
const vitePort = Number(process.env.CAMPUS_VITE_PORT || 5173);
if (!Number.isInteger(vitePort) || vitePort < 1024 || vitePort > 65535)
  throw Error("Invalid local Vite port");
const origins = [...new Set([5173, 5176, 5177, vitePort])]
  .flatMap((port) => [`http://localhost:${port}`, `http://127.0.0.1:${port}`])
  .join(",");
const env = (name) =>
  name === "CAMPUS_LOCAL_TEST"
    ? "1"
    : name === "CAMPUS_JWT_SECRET"
      ? signingSecret
      : name === "ALLOWED_ORIGINS"
        ? origins
        : undefined;
let bots;
const rpc = async (name, args) => {
  const result = await db.rpc(name, args);
  if (result?.snapshot && bots)
    result.snapshot = bots.annotate(result.snapshot);
  if (result?.snapshot)
    for (const stream of streams.get(result.snapshot.room_session_id) || [])
      stream.write(`data: ${JSON.stringify(result.snapshot)}\n\n`);
  return result;
};
bots = new BotController({
  db,
  rpc,
  enabled:
    process.env.CAMPUS_ENABLE_TEST_BOTS === "true" &&
    !process.env.TEST_DATABASE_URL,
});
await bots.initialize();
const botTimer = setInterval(
  () =>
    bots
      .tick()
      .catch(() => console.error("Local bot controller infrastructure error")),
  25,
);
const handler = makeHandler({
  env,
  rpc: async (name, args) => {
    let result = await db.rpc(name, args);
    if (result?.snapshot) result.snapshot = bots.annotate(result.snapshot);
    // Tests may shorten a match in this development-only harness. Production has no such option.
    const testSeconds = Number(process.env.CAMPUS_TEST_MATCH_SECONDS);
    if (
      name === "campus_action" &&
      args.p_action === "start" &&
      Number.isInteger(testSeconds) &&
      testSeconds > 0 &&
      testSeconds <= 60
    ) {
      await db.pool.query(
        "update campus_private.game_state set match_ends_at=clock_timestamp()+$1*interval '1 second' where room_id=(select id from campus_private.rooms where room_session_id=$2)",
        [testSeconds, result.snapshot.room_session_id],
      );
      result.snapshot = (
        await db.pool.query(
          "select campus_private.publish((select id from campus_private.rooms where room_session_id=$1)) as snapshot",
          [result.snapshot.room_session_id],
        )
      ).rows[0].snapshot;
    }
    if (result?.snapshot) {
      const body = `data: ${JSON.stringify(result.snapshot)}\n\n`;
      for (const stream of streams.get(result.snapshot.room_session_id) || [])
        stream.write(body);
    }
    return result;
  },
});
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "http://localhost:5173";
  if (!env("ALLOWED_ORIGINS").split(",").includes(origin)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (req.url === "/health") {
    res.writeHead(200);
    res.end("ok");
    return;
  }
  let body = "";
  for await (const part of req) {
    body += part;
    if (body.length > 4096) {
      res.writeHead(413);
      res.end();
      return;
    }
  }
  if (req.url === "/events") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    try {
      const b = JSON.parse(body);
      const { payload } = await jwtVerify(
        b.access_token,
        new TextEncoder().encode(signingSecret),
        { algorithms: ["HS256"] },
      );
      if (payload.room_session_id !== b.room_session_id)
        throw new Error("Wrong room");
      const client = await db.pool.connect();
      let rows;
      try {
        await client.query("begin");
        await client.query("set local role anon");
        await client.query("select set_config('request.jwt.claims',$1,true)", [
          JSON.stringify(payload),
        ]);
        rows = await client.query(
          "select snapshot from public.room_snapshots where room_session_id=$1",
          [b.room_session_id],
        );
        await client.query("commit");
      } finally {
        client.release();
      }
      if (!rows.rows[0]) throw new Error("Room missing");
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      });
      res.write(
        `data: ${JSON.stringify(bots.annotate(rows.rows[0].snapshot))}\n\n`,
      );
      const set = streams.get(b.room_session_id) || new Set();
      streams.set(b.room_session_id, set);
      set.add(res);
      const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15000);
      const expiry = setTimeout(
        () => res.end(),
        Math.max(0, payload.exp * 1000 - Date.now()),
      );
      res.on("close", () => {
        set.delete(res);
        clearInterval(heartbeat);
        clearTimeout(expiry);
      });
      return;
    } catch {
      res.writeHead(401);
      res.end();
      return;
    }
  }
  if (req.url?.startsWith("/test-bots/")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    try {
      if (!bots.enabled) throw Error("Local test bots are disabled");
      if (req.method !== "POST") throw Error("POST required");
      const b = JSON.parse(body);
      let result;
      if (req.url === "/test-bots/create") {
        if (
          typeof b.name !== "string" ||
          !b.name.trim() ||
          b.name.length > 24 ||
          !/^[a-f0-9]{64}$/.test(b.player_token)
        )
          throw Error("Invalid test setup");
        result = await bots.create(b.name, b.count, b.player_token);
      } else if (req.url === "/test-bots/control")
        result = await bots.control(b);
      else throw Error("Invalid test endpoint");
      if (result.player_id) {
        const auth = await handler(
          new Request("http://localhost/action", {
            method: "POST",
            headers: { origin, "content-type": "application/json" },
            body: JSON.stringify({
              action: "sync",
              player_id: result.player_id,
              room_session_id: result.room_session_id,
              player_token: result.player_token || b.player_token,
              request_id: crypto.randomUUID(),
              revision: 0,
              payload: {},
            }),
          }),
        );
        if (!auth.ok) throw Error("Test session could not reconnect");
        result = { ...result, ...(await auth.json()) };
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: e.code ? "Local test request rejected" : e.message,
        }),
      );
    }
    return;
  }
  if (req.url !== "/action") {
    res.writeHead(404);
    res.end();
    return;
  }
  const request = new Request("http://localhost:8787/action", {
    method: req.method,
    headers: req.headers,
    ...(req.method === "POST" ? { body } : {}),
  });
  const result = await handler(request);
  res.writeHead(result.status, Object.fromEntries(result.headers));
  res.end(await result.text());
});
server.listen(Number(process.env.CAMPUS_LOCAL_PORT) || 8787, "127.0.0.1", () =>
  console.log(
    `CampusStack local PostgreSQL game server: http://localhost:${Number(process.env.CAMPUS_LOCAL_PORT) || 8787} (ephemeral development rooms)`,
  ),
);
async function stop() {
  clearInterval(botTimer);
  for (const set of streams.values()) for (const s of set) s.end();
  server.close();
  await db.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
