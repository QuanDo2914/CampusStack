# CampusStack expanded rules

This changes the existing React/Vite/TypeScript app and Supabase transactional foundation. It does not replace production synchronization with a local game engine.

## Inspection and open design decisions

The workspace, the user's checkout, and GitHub `main` contain **one gameplay mode**. HomeScreen's `mode` variable is the create/join tab. GitHub branch search returned only `main`. There are no character abilities or sound system to preserve. Two existing gameplay modes cannot be preserved without their definitions or source.

The request has conflicting corner instructions: the detailed four-corner section explicitly prohibits Free Parking as a corner, while a later section requests it. This implementation follows the detailed four-corner layout and places Parking Commons on an edge.

Expanded rooms currently have no match deadline/net-worth winner, so exactly the four specified victories can end the match. `started_at` is retained for elapsed-time UI or a later overtime clock. Final timer/mode behavior is pending the user's clarification. No second mode has been invented; this is a draft shared-mechanics upgrade, not a finished two-mode release.

## Architecture and migration safety

- `006_board_config.sql`: generated board and event deck from `src/data/*.json`. Run `node scripts/generate-board-sql.mjs` when authoring a new configuration migration; never edit an applied migration to change a hosted board.
- `007_expanded_game.sql`: additive columns, expanded assets/trade tables, new private rule functions, and six/seven-argument action compatibility.
- Existing rooms receive `rules_version=1`; they retain positions, balances, ownership, status, deadlines, signed read claims and original game logic.
- New clients send `rules_version:2` on create/join. Five-argument `campus_enter` creates version-2 rooms explicitly. Four-argument entry continues to create legacy rooms for old clients.
- Old entry requests cannot join version-2 rooms. New UI still renders existing version-1 rooms correctly.
- Both action signatures lock the room row, verify the player-secret hash, validate action ownership, and deduplicate requests. Version 2 also compares action payloads on request-ID reuse. Room-scoped RLS and Realtime stay intact.
- Dice, salary, rent, upgrades, auction bidding/settlement, trades, debt recovery, Jail, travel and victory execute within the same SQL transaction. Clients send intentions only.
- Trade acceptance compares the original asset-state fingerprint, current ownership, cash, eligibility and pending status. All transfers commit together.
- `check_victory` is the sole expanded winner evaluator. It checks all active players after every asset/status-changing action, stores one winner, stops mutation and cancels pending trades.
- Decisions/auctions use database timestamps. A connected client's timeout action or any later request progresses expired decisions. No scheduler is introduced.

## Release procedure after design clarification

1. Review the migration and run the tests against a dedicated native Postgres/Supabase staging database. The PGlite suite exercises PostgreSQL functions but serializes concurrent connections.
2. Inspect migration history for `sfhqhuobmwfonoegkaya`; apply **only 006 and 007** if 001–005 already exist. Obtain a normal backup before a production schema upgrade. Do not point the test harness at production.
3. With a linked, authenticated Supabase CLI, use `supabase db push` only after confirming history matches. If previous migrations were manually applied, reconcile migration history first or apply the two new SQL files in a single transaction in the dashboard; do not blindly replay 001–005.
4. Deploy `game-api` from this directory: `SUPABASE_TELEMETRY_DISABLED=1 supabase functions deploy game-api --project-ref sfhqhuobmwfonoegkaya --no-verify-jwt`. Existing server secrets/signing keys remain configured; no new credential is needed.
5. Deploy frontend through the existing Vercel project. Keep only public Supabase URL/publishable key in Vite variables. Add the exact preview origin to ALLOWED_ORIGINS when testing preview builds.
6. Test two independent browsers/devices: create/join, unique character, start, roll, purchase, auction, trade, refresh and reconnect. Confirm actual Supabase Realtime updates and no duplicate economic changes. Smoke-test all four win screens in staging.
7. Verify an already active legacy room still finishes under its original timer rules. Verify an old cached client gets a clear error when joining an expanded room.

The existing public deployment is not changed by local implementation. No service-role keys, JWT signing secrets, env files or generated player secrets are committed.

## Local preview

`npm run dev:local` uses the same SQL migrations in embedded PostgreSQL and a development-only snapshot stream. Rooms are ephemeral. To use spare ports while another preview runs:

```sh
CAMPUS_LOCAL_PORT=8789 npm run test:server
VITE_LOCAL_SERVER_URL=http://localhost:8789 npm run dev -- --port 5176
```

Open localhost:5176 and 127.0.0.1:5176 for independent storage identities. Cross-device production requires Supabase and HTTPS; the local backend remains loopback-only.
