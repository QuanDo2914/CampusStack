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

## Local bot harness (PR #1 continuation)

- 62 Node tests passed: original 48 plus 14 bot tests.
- TypeScript and production builds passed with `VITE_ENABLE_TEST_BOTS` false and
  true. An independent esbuild test checks both flags with production mode and
  confirms the bot setup/panel/controller are absent.
- Disabled local server returned `Local test bots are disabled` for a direct
  `/test-bots/create` request. Hosted game-api has no bot endpoint or action.
- Chrome localhost UI created human + 1, + 2, + 3 bots; distinct characters and
  full player lists appeared in the normal lobby.
- Played a four-player match: chose Coffee, rolled 5+2, bought Campus Gym for $160,
  ended the turn; bots automatically rolled, flew from Airport, bought assets,
  paid fees/events, crossed START and returned the turn to the human.
- Verified pause, Fast speed, reset to a new four-player lobby, and reload.
- Production preview showed the ordinary multiplayer home with no bot option.
- Automated fixtures exercise capped finite auctions, debt liquidation/payment,
  bankruptcy, legal upgrades/Jail/Airport/event choices, authenticated controls,
  trade rejection and all four normal bot victory results. Victory scenarios use
  controlled database fixtures followed by normal actions, not full-length matches.

Limitations: paused bots still face normal game deadlines; auctions remain 30s
in Fast/Instant; reset creates a new room and pauses the previous one; local
server restart discards rooms. No sophisticated negotiation or counters, and
Classic/Chaos remains deferred. No production deployment was performed.

## Desktop tabletop UI pass

- 63 Node tests pass: all 62 prior tests plus a tabletop regression covering full
  accessible property names, 40-space rendering, shared occupancy, mortgages and
  Landmark development. TypeScript and production build pass.
- Verified exact CSS viewports with devicePixelRatio=1 and no CSS zoom:
  1366×768, 1440×900, 1536×864, 1920×1080. At each size the document dimensions
  equal the viewport; all 40 tile bounds are inside it. The normal-turn center
  stage has no internal scrolling and its main controls are visible.
- Local browser exercised human roll, Airport selection, purchase, doubles,
  property deed, property manager and trade dialogs; observed normal bot turns,
  auctions, complete districts and building markers using the existing bot harness.
- At 1366×768, Airport/property offer and auction stages fit without internal
  scrolling. Original 30-second server timers, bidding, ownership and cash remain
  synchronized. No schema, RPC, bot strategy/controller or engine changes.
- Screenshots captured at all four target sizes; requested 1366×768, 1440×900 and
  1920×1080 images are delivered in chat alongside the source update.

Desktop-first limitations: narrow widths retain desktop composition with scrolling;
phone-specific sheets/layouts are deferred. The 2.5D treatment uses restrained CSS
perspective and layered shadows rather than a 3D engine. Long history, holdings and
complex dialogs scroll within their own panels. No main merge or production deploy.

## Focused desktop material polish

- Presentation-only update: perimeter order/perspective retained, with an additional
  approximately 7–8% board reduction and wider rail separation. The upright action
  card is approximately 12–15% narrower, with quieter secondary controls.
- Data-driven CornerTile accepts artwork, primary label and optional subtitle.
  Airport uses the shared SVG emblem at a restrained size and “Fast Travel” copy.
- Strengthened owner bands, physical piece bases, building/Landmark markers, mortgage
  labels and district accents; separated score rail with always-visible asset/status
  metadata and expanded mortgage information. Added restrained shrubs/benches,
  material shadows, inset dice pips, doubles emphasis and a deliberate slim history bar.
- Dice tumble starts from confirmed snapshot dice/roll events, rather than request
  pending state. Existing confirmed movement/cash/building/event/auction/victory
  animations remain; reduced-motion overrides apply to all new effects.
- 63 Node tests pass, including corner copy/accessibility and compact player metadata.
  TypeScript and production build pass. All four exact desktop viewports have all
  40 tile bounds visible, no page overflow and clear normal-turn action controls.
- Browser played roll/rent and purchase/auction flows. Smaller offer/auction panels
  were compacted after an intermediate perimeter overlap was caught during review.
  Screenshots delivered at 1366×768, 1440×900 and 1920×1080.
- No rules, board data/order, Supabase schema/RPC, bot logic or victory evaluator
  changes. No merge or production deployment. Dense event choices/dialogs retain
  their existing scrolling behavior; portrait mobile remains out of scope.
