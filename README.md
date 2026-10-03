# CampusStack

An original, 15-minute campus property game for 2–4 people. React + Vite + TypeScript, with Supabase Postgres, Edge Functions and Realtime in production. No user accounts or Supabase Auth users are created.

## Run locally now — no Supabase credentials needed

Use Node.js **22.12 or later**.

```sh
npm ci
npm run dev:local
```

Open **http://localhost:5173**. Open a second independent browser, an incognito window, or **http://127.0.0.1:5173** for a second storage identity. Create a room in the first browser, join using its code in the second, and start the match.

The development server uses PGlite (embedded PostgreSQL) to execute the actual production migrations and SQL actions. A development-only HTTP event stream distributes committed snapshots. The production adapter uses Supabase Realtime subscriptions instead. Development rooms are ephemeral: restarting the local server resets them. Use “Back to home” if a saved seat refers to a room from an earlier server run.

This local setup serves its backend on loopback and is intended for multiple browsers on the same computer. To play across phones/laptops, deploy both frontend and Supabase as described below. HTTPS is needed for browser secure-context APIs. There is no fake client-side game engine.

## Rules

- Everyone starts on START with $1,500. The host starts with 2–4 players; seating order determines turns.
- One six-sided die per turn. Movement resolves on the server. Crossing **or landing** on START awards $100 **once for that movement**.
- Unowned property: buy at its fixed price or skip. Buying requires sufficient cash. Either choice ends your turn.
- Someone else’s property: pay full listed rent automatically. Your own property: no charge.
- Events: Scholarship +$150; Parking Ticket −$75; Free Coffee +$50; Campus Construction −$100, each equally likely.
- Fee spaces charge their listed amount. Mandatory charges may make cash negative. No selling, elimination or bankruptcy.
- A turn lasts **30 seconds total**, including a purchase decision. An expired unrolled turn skips; an expired purchase skips the purchase.
- The match ends after **15 minutes**. Net worth = cash + original purchase prices of owned properties. Equal top scores share the win.
- Categories are visual neighborhoods only; no rent multipliers. No trading, auctions, upgrades or mortgages.

The same rules are available through the Rules modal.

## Production architecture

The browser sends intentions to `game-api`; it cannot write authoritative tables or execute mutation RPCs. The function uses a server-only Supabase key to call SQL functions. SQL functions authenticate a 256-bit player secret by its SHA-256 hash, lock the room row, validate deadlines/turn/phase/revision, compute outcomes, and commit a complete snapshot atomically.

`campus_private` contains rooms, players, board spaces, ownership, game state, events, idempotency records and rate buckets. The only browser-readable table is `public.room_snapshots`; RLS allows a row only when the signed JWT’s `room_session_id` matches it. An ordinary publishable key has no room claim and returns **zero snapshots**, including when attempting enumeration. No browser insert/update/delete policies exist. The six-character join code never appears in snapshots or subscription filters.

Room session IDs have 64 hexadecimal characters derived from two randomly generated UUIDs. Players receive one only after joining/creating successfully. Read tokens are signed on the server, expire in one hour and refresh while connected. Player IDs, room session IDs, the human join code and the player’s secret are persisted in localStorage on that device. Clearing storage loses the seat. Sharing a read token grants access to that room’s public game state; it does not grant action rights without the separate player secret.

Mutation request IDs prevent retries from rerolling or charging twice. Gameplay revisions reject stale clicks, even if a player gets another turn later. Presence heartbeats update last-seen timestamps without advancing game revisions. Supabase Realtime sends whole snapshots; revision checks discard older state. Subscribe-then-fetch, 15-second sync heartbeats and connection retries recover missed events. Token animation uses committed positions and respects reduced-motion preferences.

There are **no Cron jobs**. Clients call `advance-turn` at turn expiry and `finish-game` at match expiry. Both are idempotent under the room lock; every other action checks the match deadline too. If everyone is offline, wall-clock time keeps passing and the next authenticated request finalizes the expired match. The final leaderboard is stored once.

Basic entry rate limiting is keyed by a hash of the gateway-forwarded address; action limits use a hash of the player secret. Raw addresses are not stored. This is modest MVP abuse protection, not a substitute for gateway-level controls. CORS accepts an explicit origin list. Failed infrastructure calls do not return database errors or credentials.

## Supabase setup

Create a **new dedicated Supabase project**. Install the official Supabase CLI, then, from this directory:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migrations are applied in numeric order (`001` through `005`). They register `room_snapshots` with the `supabase_realtime` publication. Confirm Realtime is enabled for that table. No anonymous sign-in setting is needed.

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

Open two independent browser sessions and repeat create → join → start → roll → buy/skip. Verify updates reach the other session through Supabase Realtime. This is the required hosted integration check before sharing publicly.

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

The Playwright test server sets `CAMPUS_TEST_MATCH_SECONDS=8` only in the development harness to check expiry without waiting 15 minutes. The production Edge Function and SQL actions have no configurable match duration; normal local play uses 15 minutes. Stop an existing local test server before running E2E tests so the shortened test duration takes effect.

The Playwright suite creates independent storage contexts, tests the lobby, gameplay, refresh and mobile layout. Browser launch requires the host to permit Chromium processes. In the restricted authoring environment, standalone Chromium launch was blocked; the app’s browser tools were used to verify two separate storage origins instead.

`TEST_REPORT.md` records what was actually verified. Hosted Supabase Realtime, Edge deployment and Vercel have not been tested because no projects/accounts are configured yet.

## Operational limits for the MVP

- No private chat or sensitive data: players see display names and gameplay within their room.
- Browser storage is a bearer capability. There is no identity recovery across devices or after clearing storage.
- Disconnects keep the seat. Timeouts progress only when a participant is connected or sends a request; deadlines are always server enforced.
- Local development rooms reset on server restart; hosted rooms persist in Postgres.
- Old rooms are retained. Add manual retention/cleanup later if needed; there is no background scheduler in this MVP.
- Supabase signing keys, Realtime delivery, permissions and CORS must be verified in the target project before public launch.
