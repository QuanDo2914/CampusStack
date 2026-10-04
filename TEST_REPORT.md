# Expanded CampusStack verification — October 4, 2026

## Automated

- `npm test`: **48 passed, 0 failed**.
- Includes original 20 legacy database/API tests and 25 expanded/compatibility tests and 3 frontend render tests.
- Two dice, doubles/extra roll, third doubles Jail; exact START landing/crossing and Jail-release salary.
- Purchases, automatic rent, stations/scaling, color sets, even upgrades/downgrades, mortgages/unmortgages.
- All four exact victories, incomplete-side/set rejection, maximum-level empire requirement, finalized mutation rejection and one winner/event.
- Airport destination effects, no free ownership/salary, invalid/self-loop destination rejection.
- Auction bid/cash validation, timeout settlement once, auction victory.
- Trade cash/ownership transfers, retry idempotency, counteroffers, stale assets/cash/mortgage-state rejection, trade victory.
- Mandatory debt, mortgage recovery, payment, bankruptcy elimination/creditor asset transfer, bank asset return, timeout liquidation, last survivor.
- All 30 event cards, interactive grants/gifts and one-use rent protection/bonus.
- Migration of an already active legacy room; explicit expanded entry; old-client/version compatibility.
- Existing RLS, entry capacity, signed room JWTs, ES256 import regression, safe error diagnostics and rate-limit tests preserved.
- TypeScript checks via `npm run build`: passed. Production Vite build: passed.
- Frontend renders an empty fresh board, all action phases, unique auction labels, correct zero mortgage rent, and all four victory screens.
- No lint command/configuration is present.

Tests use PGlite, which serializes connections. Promise-based concurrent calls test deduplication outcomes; they do not prove native Postgres row-lock behavior. A dedicated empty native test database can be supplied through TEST_DATABASE_URL. Never use production for the destructive test bootstrap.

## Browser verification

Real app and local PostgreSQL-backed transport, through Chrome's connected browser tools:

- Separate localhost and 127.0.0.1 origins for independent localStorage/session identities.
- Quan created a room; Alex joined; robot selection synchronized; unique selected character unavailable to the other player.
- Host started; both boards/current turn synchronized.
- Rolled 4 + 4; mandatory $75 fee; extra roll 3 + 6; purchased Study Commons for $200. Both clients displayed ownership and $1,225 host cash.
- Guest refresh restored Alex and the committed property state.
- Fresh version-2 entry after a local server restart successfully created/joined and started a new room. An auction for Green Street Pizza accepted Alex’s $80 bid and synchronized it to Quan. At timeout Alex received it for $80, both clients showed $1,420 guest cash, and the property detail card displayed all six rent levels.
- Quan offered Study Commons for $125; Alex received and accepted. Both showed Alex owning it, Quan $1,350 and Alex $1,375.
- Phone viewport: turn controls above board, board horizontally scrollable, no horizontal page overflow. Property details and trading dialogs accessible through real controls.
- Desktop and mobile screenshots saved alongside the project output.

Browser checks used a local event-stream adapter, not hosted Supabase Realtime. The expanded hosted migration, native concurrency/staging test, production function deployment and two-mode behavior remain unverified. The old Playwright suite targets legacy rules; it was not rerun during this upgrade. Optional sound was not added because no sound system exists.

## Bugs caught and repaired

SQL alias ambiguity in trade/debt actions; nonunique test room codes; random event lookup re-evaluating random() per row; Jail-release salary omission; changed mortgage state in outstanding offers; duplicate mobile/desktop grant selector IDs; mortgaged property card incorrectly showing base rent.
