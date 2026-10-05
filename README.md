# CampusStack

An original campus property-trading game for 2–4 people. Buy. Build. Trade. Own the campus. React + Vite + TypeScript, with Supabase Postgres, Edge Functions and Realtime in production. No user accounts or Supabase Auth users are created.

## Run locally now — no Supabase credentials needed

Use Node.js **22.12 or later**.

```sh
npm ci
npm run dev:local
```

Open **http://localhost:5173**. Open a second independent browser, an incognito window, or **http://127.0.0.1:5173** for a second storage identity. Create a room in the first browser, join using its code in the second, and start the match.

The development server uses PGlite (embedded PostgreSQL) to execute the actual production migrations and SQL actions. A development-only HTTP event stream distributes committed snapshots. The production adapter uses Supabase Realtime subscriptions instead. Development rooms are ephemeral: restarting the local server resets them. Use “Back to home” if a saved seat refers to a room from an earlier server run.

This local setup serves its backend on loopback and is intended for multiple browsers on the same computer. To play across phones/laptops, deploy both frontend and Supabase as described below. HTTPS is needed for browser secure-context APIs. There is no fake client-side game engine.

## Expanded rules (new rooms)

- Forty campus spaces on a square board; START, Airport, Go To Jail, and Jail are the four corners. Four stations, eight color groups, and a restful Parking Commons on an edge.
- Choose one of eight unique character tokens. Start with $1,500. Roll **two dice**. Normal dice movement passing or landing on START pays $100 once; teleportation/event travel never does.
- Doubles grant another roll after resolving the landing. Three consecutive doubles send you to Jail and end your turn.
- Buy an unowned asset or skip to a synchronized 30-second auction. All active players can bid with available cash. Unbid assets stay unowned.
- Rent transfers automatically. Stations scale $25/$50/$100/$200. An undeveloped complete, unmortgaged color group doubles base rent.
- Complete color groups unlock five development levels. Build and sell evenly. Inspect any property; open Property manager on your turn without needing to land on it.
- Trade assets and cash with accept/decline/counter. Sell group upgrades before trading. Offers are revalidated at acceptance, including mortgage state.
- Mortgage undeveloped assets for half their purchase price; repay mortgage + 10% to unmortgage. Mortgaged assets charge no rent. Sell upgrades at half their cost, or undeveloped assets to the bank for mortgage value (mortgaged sales pay $0).
- Mandatory debts pause the turn for liquidation, trading or bankruptcy; cash never becomes negative. Bankruptcy transfers assets/cash to a player creditor, or returns assets to the bank. Eliminated players spectate.
- Jail: attempt doubles, pay $50, or use a pass. Third failed attempt requires bail and then moves that roll. Jail-release doubles do not give an extra roll. Visitors are free.
- Airport: click any **other** valid destination. Resolve that landing normally. Flying to START pays no salary; stations must still be purchased.
- Thirty event cards include cash, movement, Jail, grants, targeted gifts, group payments and one-use rent effects. Birthday Fund collects only available cash from each other player; grant upgrades still follow complete-set/even-building rules.
- Decisions expire after 30 seconds. Pending purchases become auctions. Inactive turns advance. Debt expiry automatically sells buildings and mortgages assets before paying or declaring bankruptcy.
- Exactly four victories: **Last Player Standing**, **Straight-Line Monopoly** (every purchasable space on one side, including the station), **Transit Monopoly** (all four stations), **Property Empire** (three complete groups, two entirely level 5).
- Achievements never add win conditions. If an action satisfies multiple victories, the evaluator uses a deterministic priority: last standing, transit, side, empire; simultaneous player eligibility uses seating order.

The in-app Rules modal explains all mechanics. Expanded games currently play until a qualifying victory; no net-worth timer winner. Existing version-1 rooms retain their original 20-space, one-die, 15-minute rules until they finish. These schema versions are **not** the two requested gameplay modes: only one gameplay mode exists in the inspected checkouts and GitHub main. Mode definitions and final timer behavior are pending clarification; see `UPGRADE.md`.

## Production architecture

The browser sends intentions to `game-api`; it cannot write authoritative tables or execute mutation RPCs. The function uses a server-only Supabase key to call SQL functions. SQL functions authenticate a 256-bit player secret by its SHA-256 hash, lock the room row, validate turn/phase/revision and authoritative decision deadlines, compute outcomes, and commit a complete snapshot atomically.

`campus_private` contains rooms, players, board definitions, legacy ownership, expanded assets, trade offers, game state, events, idempotency records and rate buckets. The only browser-readable table is `public.room_snapshots`; RLS allows a row only when the signed JWT’s `room_session_id` matches it. An ordinary publishable key has no room claim and returns **zero snapshots**, including when attempting enumeration. No browser insert/update/delete policies exist. The six-character join code never appears in snapshots or subscription filters.

Room session IDs have 64 hexadecimal characters derived from two randomly generated UUIDs. Players receive one only after joining/creating successfully. Read tokens are signed on the server, expire in one hour and refresh while connected. Player IDs, room session IDs, the human join code and the player’s secret are persisted in localStorage on that device. Clearing storage loses the seat. Sharing a read token grants access to that room’s public game state; it does not grant action rights without the separate player secret.

Mutation request IDs prevent retries from rerolling or charging twice. Gameplay revisions reject stale clicks, even if a player gets another turn later. Presence heartbeats update last-seen timestamps without advancing game revisions. Supabase Realtime sends whole snapshots; revision checks discard older state. Subscribe-then-fetch, 15-second sync heartbeats and connection retries recover missed events. Token animation uses committed positions and respects reduced-motion preferences.

There are **no Cron jobs**. Connected clients request timeout progression; every action checks decision deadlines under the same room lock. A centralized `check_victory` function runs after ownership, upgrade, trade and elimination changes. Once finished, further mutations are rejected and retries return the committed result. Expanded action idempotency also fingerprints payloads. Legacy rooms keep their authoritative `match_ends_at` and idempotent timer finalization. If everyone is offline, the next authenticated request progresses the expired decision.

Basic entry rate limiting is keyed by a hash of the gateway-forwarded address; action limits use a hash of the player secret. Raw addresses are not stored. This is modest MVP abuse protection, not a substitute for gateway-level controls. CORS accepts an explicit origin list. Failed infrastructure calls do not return database errors or credentials.

## Supabase setup

Create a **new dedicated Supabase project**. Install the official Supabase CLI, then, from this directory:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migrations are applied in numeric order (`001` through `007`). They register `room_snapshots` with the `supabase_realtime` publication. Confirm Realtime is enabled for that table. No anonymous sign-in setting is needed.

### Configure the room-token signing key

Supabase must trust the key used by `game-api`; an unrelated random JWT secret will not work.

Recommended for a new project:

1. Generate an ES256 private JWK using `supabase gen signing-key --algorithm ES256`. Keep its private `d` value secret. Save the generated JSON securely outside source control.
2. In Supabase’s **JWT Signing Keys** dashboard, import that same key as a standby key and rotate to activate it. Keep the same `kid`. Do not revoke unrelated existing keys during setup.
3. Copy `supabase/functions/.env.example` to `supabase/functions/.env`. Set `CAMPUS_JWT_JWK` to the private JWK on **one line**, including `kid` and `"alg":"ES256"`. Leave `CAMPUS_JWT_SECRET` empty.
4. Set `CAMPUS_SERVER_KEY` to the project’s modern server secret API key if using that approach. Otherwise the function uses the server-only `SUPABASE_SERVICE_ROLE_KEY` supplied by Supabase. Never put either key in Vite’s environment.
5. Set `ALLOWED_ORIGINS` to the exact frontend origin, plus localhost if needed. Separate origins with commas, no trailing slashes. Add specific preview deployment origins only when testing those deployments.

A trusted, still-active legacy JWT secret can instead be supplied as `CAMPUS_JWT_SECRET`, leaving the JWK empty. Imported ES256 is preferred. See [Supabase signing-key instructions](https://supabase.com/docs/guides/auth/signing-keys) and [custom JWTs with Realtime](https://supabase.com/docs/guides/realtime/postgres-changes#custom-tokens).

Upload the server environment and deploy:

```sh
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy game-api --no-verify-jwt
```

`verify_jwt=false` is intentional: entry happens before a room JWT exists. The handler and database validate the separate player secret on all subsequent actions. Realtime/Data API still require correctly signed room JWTs and enforce RLS. Never configure `CAMPUS_LOCAL_TEST` on the hosted function; it is exclusively for the local transport harness.

### Connect the frontend

Copy `.env.example` to `.env`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PROJECT_PUBLISHABLE_KEY
```

These two values are public configuration. No service-role key, server secret API key, JWT private JWK or JWT signing secret belongs in a `VITE_` variable. Do not set `VITE_LOCAL_SERVER_URL` for production. That adapter is also guarded by Vite’s `DEV` flag.

```sh
npm run dev
```

Open two independent browser sessions and repeat create → join → start → roll → buy/auction → manage → trade → end turn. Verify updates reach the other session through Supabase Realtime. This is the required hosted integration check before sharing publicly.

## Upgrading the existing hosted project

See `UPGRADE.md` for the staged release and compatibility checks. Do not rerun old migrations in a database where they already exist. Keep all existing signing keys and environment secrets unchanged. Apply only the new migrations after confirming migration history, then deploy the updated function, then the frontend. The five-argument entry RPC explicitly opts into expanded rules; old clients use the original four-argument RPC. Old cached clients are rejected when joining an expanded room with a clear refresh message.

## Vercel deployment

1. Push this directory to a Git repository and import it into Vercel. If part of a larger repository, choose this directory as the project root.
2. Select **Vite**, Node.js 22 or later, build command `npm run build`, output directory `dist`.
3. Add only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to Vercel’s environment.
4. Deploy. Add the exact generated HTTPS origin to the backend `ALLOWED_ORIGINS`, then re-upload the Supabase secrets file.
5. Open the deployed URL on two different devices and run the integration check above.

`vercel.json` provides SPA rewrites and basic response headers. Server-side secrets remain in Supabase, not Vercel’s frontend build. Netlify can also host `dist` with the same public frontend environment variables and SPA fallback.

## Tests and verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Database tests cover room entry, capacity, invalid/full/started rooms, host permissions, room-scoped RLS, unauthorized writes, signed token claims, validation, rate limits, turn ownership, duplicate rolls/purchases, stale revisions, exact START landing and crossing, negative balances, rent, fees, events, purchase timeouts, finalization, deadline guards, net worth and tied winners.

Default tests run in PGlite, which serializes connections. To exercise real PostgreSQL row-lock concurrency, run each database test file against its own **empty disposable PostgreSQL database**, setting `TEST_DATABASE_URL`. The helper creates roles/schema/publication and migrations and refuses to work cleanly in a pre-existing application database. Use an isolated test cluster with a privileged setup user; roles are cluster-wide, so separate test files must not share a populated cluster. PGlite tests alone do not prove concurrent locking on hosted Supabase.

The Playwright test server sets `CAMPUS_TEST_MATCH_SECONDS=8` only in the development harness to check expiry without waiting 15 minutes. The legacy test configuration sets `CAMPUS_LEGACY_TEST=1`; normal local play uses expanded rules. Expanded games have no timer winner. Stop an existing local test server before running E2E tests so the shortened test duration takes effect.

The Playwright suite creates independent storage contexts, tests the lobby, gameplay, refresh and mobile layout. Browser launch requires the host to permit Chromium processes. In the restricted authoring environment, standalone Chromium launch was blocked; the app’s browser tools were used to verify two separate storage origins instead.

`TEST_REPORT.md` records what was actually verified. The expanded release has not been applied to hosted Supabase or Vercel. Existing production setup and credentials are preserved; deployment awaits the mode/timer clarification.

## Operational limits for the MVP

- No private chat or sensitive data: players see display names and gameplay within their room.
- Browser storage is a bearer capability. There is no identity recovery across devices or after clearing storage.
- Disconnects keep the seat. Timeouts progress only when a participant is connected or sends a request; deadlines are always server enforced.
- Local development rooms reset on server restart; hosted rooms persist in Postgres.
- Old rooms are retained. Add manual retention/cleanup later if needed; there is no background scheduler in this MVP.
- Supabase signing keys, Realtime delivery, permissions and CORS must be verified in the target project before public launch.

### Local human vs computer test harness

Stop any older local preview, run `npm run dev:bots` in the source checkout, then
open the Vite localhost URL. If ports are occupied, use e.g.
`CAMPUS_LOCAL_PORT=8790 CAMPUS_VITE_PORT=5177 npm run dev:bots`.
Both servers bind to loopback; Vite fails clearly rather than silently choosing an
unapproved origin when its selected port is occupied.
Choose **🤖 VS COMPUTER — TEST MODE**, enter your name and select 1–3 bots
(default 2). Choose your character in the normal lobby and start the match.
The existing board, actions, trade UI and victory screen are shared with multiplayer.

`npm run dev:local` runs ordinary local multiplayer with bots disabled. Stop the
process to discard ephemeral rooms. Never set `VITE_ENABLE_TEST_BOTS=true` in
Vercel or Supabase. Both Vite development mode and that explicit flag are required;
production builds remove the bot menu/setup/panel even if the flag is accidentally
set. The local client also requires a loopback development server URL.

The server flag `CAMPUS_ENABLE_TEST_BOTS=true` is set only by `dev:bots`. Bot
endpoints exist only in `tests/local-server.mjs`, bound to `127.0.0.1`, with an
explicit loopback-origin allowlist. They are disabled when `TEST_DATABASE_URL` is
provided. No bot endpoint, SQL migration or hosted Edge Function change is needed.
Local test-room metadata is stored in an ephemeral private table; bot tokens stay
in server memory. Human identity uses the normal saved session and scoped stream.

The developer panel offers pause/resume, skip delay, Normal (750ms), Fast (150ms),
and Instant (10ms), plus reset into a fresh lobby with the same bot count. Pause
stops automation; ordinary 30-second turn/auction clocks continue. Fast/Instant
shorten decisions, not engine deadlines. Reset pauses the previous room. Reload
reconnects your saved seat; restarting the local server discards all local rooms.

Bots keep a $300 reserve, value set/station/side progress, use stable per-player
auction caps, develop evenly, choose strategic Airport destinations, use Jail
passes/bail/doubles, and recover debt by selling upgrades and mortgaging before
bankruptcy. They accept or decline human trades and reject immediate station/side
victory giveaways. All decisions use the existing authenticated transactional RPC;
no React state mutations, external AI, special human benefits or alternate engine.
Classic/Chaos is still deferred; this is a testing environment for expanded rules.

### Desktop tabletop presentation

Expanded games use a raised, gently angled CSS board with original inline SVG
campus stickers and character pieces. The upright center stage and player rail
consume the same snapshots/action callbacks as before. No rendering library or
new backend metadata is required. Short tile labels are presentation-only; full
property names remain available in accessible labels, tooltips and deed dialogs.

Board height responds to desktop viewport height; the compact header, collapsed
history and expandable player rail preserve the entire 40-space loop at normal
browser zoom. Verified targets: 1366×768, 1440×900, 1536×864 and 1920×1080.
Smaller widths retain a scrollable desktop composition; phone layouts are not
optimized in this pass. The rendering components under `src/components/tabletop`
are separate from room state and can be reused by a future landscape client.

Ownership badges, mortgage locks, house/landmark markers and complete-set accents
come from authoritative snapshot data. Dice/token/cash/event animations are purely
visual and respect reduced-motion preferences. Detailed trades, deeds and property
management remain accessible through the existing dialogs; game rules are unchanged.
