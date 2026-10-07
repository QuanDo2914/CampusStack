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

## Shared tile typography and marker zones

- All 40 spaces use a reusable icon/text grid and shared TileLabel: natural wrapping
  to two lines, measured title fitting in a narrow 9.5–12px range, no ellipsis,
  clipping or horizontal scaling. Prices stay 9px on a separate line, including
  mortgaged properties. Student Apts is a board-only label; Observatory remains
  unabbreviated and all authoritative names/deeds remain unchanged.
- Pieces fan along outward edge anchors; owner badges and development sit toward
  the quad. Interior gutters were tightened to reclaim text height while keeping
  the approved outer board dimensions/perspective and whitespace intact.
- Added development-only `/__dev/tiles` fixture/report covering all 40 spaces,
  mortgage/development/ownership states and one/four pieces per space. Geometry
  checks flag name width/height, subtitle overflow and markers crossing any tile's
  text/icon. It makes no game/server/session requests.
- Cross-tile audit at exact 1366×768, 1440×900 and 1920×1080 viewports (DPR 1):
  40 spaces, 160 pieces, zero text/marker failures. Observatory title measured
  9.77px, 10.59px and 12px respectively. Live match screenshots at each size show
  all tiles/pieces inside the viewport and no page overflow.
- All 63 Node tests pass; TypeScript/production build pass. Production JavaScript
  contains no tile-lab fixture/UI strings. Presentation changes only; no engine,
  authoritative board data, Supabase/RPC or bot changes. No merge or deployment.

## Isometric diamond camera and toy miniatures

- Replaced the mildly tilted rectangular plane with a projected equal-sided
  square: 45° rotation, a 2:1 diamond silhouette, SVG slab sides and ground shadow.
  Logical space order, movement, assets and action validation remain unchanged.
- Preserved open tabletop margins and a large quad; moved turn actions into a
  separate right dock with a compact expandable rail. Only one physical dice
  stage renders. Complex dock panels scroll independently of the board.
- Original SVG toys have shaded roofs/walls, plinths, windows, annexes and Landmark
  flags. Corner-aware footprints/anchors and four original corner monuments keep
  names, prices and primary icons readable. Ownership uses colored tile rims.
- Tile lab now audits cross-tile text/icon collisions and oriented rectangles against actual piece paint
  bounds, miniature/monument bounds and mortgage locks. One/four-piece fixtures
  and an explicit Recheck action are available. At exact 1366×768, 1440×900,
  1536×864 and 1920×1080: 40 tiles, 160 pieces, zero overflow/collision failures.
- Added a DEV-only read-only full scene preview at `/__dev/tabletop` to review
  four-player rails and several upgrade levels without touching a room/session.
  Screenshot fixtures are labeled read-only; they are not multiplayer state.
- All 64 Node tests pass and TypeScript/production build pass. Production JS
  contains no visual fixture/UI strings. Browser deed inspection opens the
  correct full Observatory name through the projected hit target.
- Scope is presentation/components/dev fixtures/tests/docs only. No Supabase,
  engine, authoritative board data, room/session or bot changes. No main merge
  or production deployment. Portrait mobile remains outside this desktop pass.

Surface polygons paint below all labels and hit targets, so neighboring faces
cannot hide final letters. Property print follows the other projected square
axis, retaining a readable icon/text grid and separating adjacent name lanes.
The final audit includes text/price/icon-to-text collisions as well as markers.


## District miniature and physical-piece polish (PR #2)

- Preserved the approved 2:1 isometric diamond/slab geometry. Added reusable
  district architectures and six clear development silhouettes, with a DEV-only
  one-property Level 0–5 showcase completed before applying the system broadly.
- Character pieces now have thick colored bases, pedestals and contact shadows.
  Responsive deterministic placement protects every neighboring label/icon and
  keeps pawn and miniature feet on their actual tile. Shared pawns fan cleanly.
- Corners use kind-driven original miniature scenes; the quad gains restrained
  benches/lamp detail. Ownership is a colored band with a subtle complete-group
  highlight; mortgaged development is dimmed. The active quad panel is compact;
  the separate right rail remains expandable. Confirmed dice have depth and a
  tumble/bounce/settle sequence; no client-selected results were introduced.
- All **65 Node tests pass**, including existing bot, authorization, transaction,
  game and UI tests. Added a regression for every district's six model states.
  The initial new test caught React 19 rendering an SVG title with multiple
  children as empty; a single-string title fixed it. No outstanding failures.
- TypeScript (`tsc -b`) and Vite production build pass.
- Exact 1366×768, 1440×900, 1536×864 and 1920×1080, DPR 1 / 100% zoom:
  all 40 spaces / 160 pieces pass the crowded visual audit, including glyph
  overflow, adjacent text/icon/price collisions, miniature/pawn collisions,
  on-tile feet and unresolved placement. Full-scene fixtures have no horizontal
  or vertical page overflow; board and primary action are wholly visible.
- Browser smoke on an isolated local bot server: created Visual QA + two bots,
  started, rolled a confirmed 6+1, moved to Campus Gym, bought it for $160,
  ended turn, and observed bot purchases and return to the human turn. DOM
  placement reported zero unresolved objects and correct actual-tile labels.
- Captured showcase and full-board fixture screenshots at 1366×768, 1440×900
  and 1920×1080, plus a live local bot match. Fixture screenshots are read-only
  presentation examples, not multiplayer state. Stress packing may take a few
  seconds; normal live rooms have at most four pawns in total.
- Scope: frontend presentation, DEV fixtures, UI regression test and docs only.
  Supabase, migrations, RPCs, Edge Functions, room/session code, authoritative
  board data, economics, bot logic and game rules are unchanged. No production
  deployment, main merge or Vercel reconnection.

## 36-space proposal and approval checkpoints (pending approval)

- Added DEV-only A–G style studies and a numbered proposal document. Exactly
  six adjacent three-property districts and two adjacent premium pairs on the
  final side; 36 unique retained spaces, four corners and four Transit locations.
- New proposal tests validate counts, retained/removal mapping, side adjacency,
  premium positions, distinct colors and increasing purchase/development/rent
  ceilings. All 67 unit/bot/game/UI/proposal tests pass; TypeScript/build pass.
- Browser studies checked at 1366×768, 1440×900, 1536×864 and 1920×1080: no
  horizontal overflow, over-two-line titles, title-width overflow, or overlap
  between printed text and reserved building/pawn zones. Captured all seven
  approval screenshots at 1440×900. These enlarged studies do not establish
  final full-board-scale fitting or actual SVG paint collision coverage.
- Camera correction from the preceding preview remains the baseline. The new
  art/color/ownership studies affect no real room. Production/gameplay board
  remains 40 spaces for v2, with legacy v1 preserved. No v3 gameplay/migration
  has been implemented, so 35→0 and other new board-version tests are pending
  approval and conversion. The current 40-space regression fixture is retained.
- Documented movement/corner/Transit/event/victory/version assumptions and a
  safe v3 path. No hosted changes, deployment, Vercel reconnection or merge.

## Property identity checkpoint revision — October 7, 2026

- Recorded the user's structural approval separately from the unapproved rent,
  development and L5 experiments. Purchase prices remain balancing candidates.
  No economy value was changed, applied, simulated or rebalanced in this pass.
- DEV-only Food Court studies now use one orange district band with distinct
  café, pizzeria and library/café architecture. Shared primitives retain each
  property identity across L0–L5; ownership remains a separate small flag.
- Union studies distinguish the Student Union colonnade from Alumni Hall's
  clock. START uses an open entrance arch. The camera and real v2 art/data are
  unchanged; only checkpoint examples were revised.
- All 68 Node tests pass, including a rendering regression for distinct Food
  Court identities at each development level. TypeScript/production build pass.
- Checkpoint layouts at all four desktop targets have no horizontal overflow,
  over-two-line/width-overflow titles, or print collisions with reserved model
  and pawn zones. Saved revised A–G screenshots at 1440×900. These are enlarged
  studies; final 36-space board fitting and SVG paint audits remain pending.
- Documented later seeded simulation metrics: completion frequency/turn,
  realized ROI, rent, bankruptcy contribution, conditional ownership win rates,
  and premium snowballing. No balance claims are inferred from visual tests.
- No full v3 conversion or 36 final assets. No v2/backend changes, migration,
  merge, hosted push/deploy or Vercel reconnection.
