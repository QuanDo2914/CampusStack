# CampusStack verification — October 2, 2026

## Phase results

| Phase | Implemented | Verification |
|---|---|---|
| 1 | React/Vite/TypeScript scaffold, create/join, persisted identity, lobby, realtime player list, host-only start, room-scoped snapshot access | Four database test groups passed; two browser storage identities joined the same room, both rosters updated, host start synchronized, guest refresh retained its seat. |
| 2 | Original 20-space board, authoritative turns/die/movement, START payment, 30-second timeout | Movement, duplicate rolls, turn authorization, timeout idempotency and stale revisions passed. Deterministic SQL tests verified both exact START landing and crossing pay $100 once. |
| 3 | Buy/skip, ownership, rent, cash, events, fees, event feed | Purchases cannot double-charge; insufficient cash and unauthorized purchases fail; mandatory payments allow negative cash; own-property landing charges nothing. Browser test observed Quan buy Bike Hub, Alex pay $25 rent, and both clients display $1,385/$1,475 balances. |
| 4 | Server match deadline, client-triggered finish, frozen net worth leaderboard and ties | Early finish rejected as a state change; multiple finish requests produced one finalization event; expired rolls and purchases did not mutate gameplay. Browser countdown-to-results verified in a 12-second match configured only in the local test harness. Both sessions showed the same tied leaderboard. Normal SQL start remains 15 minutes. |
| 5 | Responsive layouts, step animation, reduced-motion support, rules, reconnect attempts, saved seats, presence, validation, rate limits, deployment configuration | TypeScript and production build passed. Desktop and 390px/320px phone layouts inspected. A narrow grid overflow was fixed; final DOM page width equaled the 320px viewport. Rules modal worked on mobile; refresh preserved gameplay and identity. |

## Final automated checks

- `npm test`: **19/19 test groups passed**, using the actual SQL migrations in PGlite and the actual Edge API handler.
- `npm run build`: **passed** (TypeScript + Vite).
- JWT tests: HS256 and imported ES256 signing passed, including a JWK without an explicit `alg` field.
- RLS tests: no-claim enumeration returns zero rows; a room claim reads only its room; browser mutation and private table/function access denied.
- Dependencies: installation audit reported zero known vulnerabilities at the time of implementation.

## Browser evidence

The app’s in-app browser tools verified two independent localStorage identities using `localhost` and `127.0.0.1`:

1. Create room; host start disabled with one player.
2. Join by code; both player lists synchronize.
3. Host starts; both clients display the game.
4. Roll, automatic movement, purchase, rent and turn handoff synchronize.
5. Refresh restores identity, balances and property ownership.
6. Timeout advances inactive turns.
7. Mobile Rules modal and narrow layouts inspected.
8. Countdown expiry automatically finalizes; both browsers display the identical leaderboard.

Saved screenshots: `../campusstack-preview.png` and `../campusstack-results.png`.

## Failures, workarounds and remaining checks

- Native PostgreSQL could not initialize inside the authoring sandbox because OS shared-memory operations were denied. PGlite executes PostgreSQL SQL/PLpgSQL and RLS locally, but serializes connections. **Hosted concurrent row-lock behavior is not yet independently verified.** `TEST_DATABASE_URL` supports tests against a disposable native PostgreSQL cluster.
- Standalone Playwright Chromium launch failed due to macOS Mach-port sandbox restrictions. The automated Playwright browser suite was written, but **has not completed here**. Equivalent core flows were verified using the in-app browser tools; these used separate storage origins rather than separate physical devices.
- The local transport uses an authenticated HTTP event stream. **Actual Supabase Realtime delivery, hosted Edge Function deployment and Vercel deployment remain unverified** until the user configures those services.
- No credentials were available or hardcoded. No Supabase or Vercel resources were provisioned or published.
- One build invocation used the machine’s default Node 18 and restricted home npm cache; rerunning with Node 22 and a workspace cache passed.
- Vite’s file watcher did not pick up edits reliably in this workspace; development polling was enabled.
- No Cron/scheduled jobs, account login, trading, auctions, upgrades, mortgages, selling or elimination were added.

Follow the hosted two-device smoke test in `README.md` before public launch.
