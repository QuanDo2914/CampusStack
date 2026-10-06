import board from "../data/board.json" with { type: "json" };
export const reserve = 300;
const assets = (s) => s.assets || {};
const own = (s, id, b) => assets(s)[b.index]?.owner === id;
const group = (b) =>
  board.filter((x) => x.kind === "property" && x.category === b.category);
const purchasable = (b) => ["property", "station"].includes(b.kind);
export function value(s, id, index) {
  const b = board[index];
  let v = b.price;
  if (b.kind === "station")
    v +=
      board.filter((x) => x.kind === "station" && own(s, id, x)).length * 100;
  const g = group(b),
    count = g.filter((x) => x.index !== index && own(s, id, x)).length;
  if (g.length) v += count * 70 + (count === g.length - 1 ? 200 : 0);
  v +=
    board.filter((x) => purchasable(x) && x.side === b.side && own(s, id, x))
      .length * 25;
  return v;
}
export function maxBid(s, p, index, seed = 0) {
  // Stable variation per bot/asset, never resampled inside a bidding loop.
  const variation =
    (((String(p.id) + index + seed)
      .split("")
      .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) %
      21) -
      10) /
    100;
  return Math.max(
    0,
    Math.min(
      p.cash - reserve,
      Math.floor(value(s, p.id, index) * (1 + variation)),
    ),
  );
}
export function chooseUpgrade(s, p, free = false) {
  return board
    .filter((b) => {
      const a = assets(s)[b.index],
        g = group(b);
      return (
        b.kind === "property" &&
        a?.owner === p.id &&
        !a.mortgaged &&
        a.level < 5 &&
        (free || p.cash - b.upgrade_cost >= reserve) &&
        g.every((x) => own(s, p.id, x) && !assets(s)[x.index].mortgaged) &&
        a.level === Math.min(...g.map((x) => assets(s)[x.index].level))
      );
    })
    .sort(
      (a, b) =>
        b.rents[assets(s)[b.index].level + 1] -
        a.rents[assets(s)[a.index].level + 1],
    )[0]?.index;
}
export function evaluateTrade(s, p, t) {
  const human = t.sender;
  const stations = board.filter((x) => x.kind === "station");
  const willOwn = (b) =>
    t.take_spaces.includes(b.index) ||
    (own(s, human, b) && !t.give_spaces.includes(b.index));
  const categories = [
    ...new Set(
      board.filter((b) => b.kind === "property").map((b) => b.category),
    ),
  ];
  const completed = categories
    .map((cat) => board.filter((b) => b.category === cat))
    .filter((g) => g.every(willOwn));
  const empire =
    completed.length >= 3 &&
    completed.filter((g) =>
      g.every(
        (b) =>
          assets(s)[b.index]?.level === 5 && !assets(s)[b.index]?.mortgaged,
      ),
    ).length >= 2;
  const immediate =
    empire ||
    stations.every(willOwn) ||
    [0, 1, 2, 3].some((side) =>
      board.filter((b) => purchasable(b) && b.side === side).every(willOwn),
    );
  const receive =
    t.give_cash + t.give_spaces.reduce((v, i) => v + value(s, p.id, i), 0);
  const lose =
    t.take_cash +
    t.take_spaces.reduce(
      (v, i) =>
        v +
        value(s, p.id, i) +
        (group(board[i]).every((b) => own(s, p.id, b)) ? 200 : 0),
      0,
    );
  return (
    !immediate &&
    p.cash - t.take_cash + t.give_cash >= reserve &&
    receive >= lose * 1.1
  );
}
export function chooseDebt(s, p) {
  if (p.cash >= s.debt.amount) return { action: "pay-debt" };
  const owned = board.filter((b) => own(s, p.id, b));
  const developed = owned
    .filter((b) => assets(s)[b.index].level > 0)
    .sort((a, b) => assets(s)[b.index].level - assets(s)[a.index].level);
  if (developed.length)
    return { action: "downgrade", payload: { space: developed[0].index } };
  const mortgage = owned
    .filter((b) => !assets(s)[b.index].mortgaged)
    .sort((a, b) => value(s, p.id, a.index) - value(s, p.id, b.index));
  return mortgage.length
    ? { action: "mortgage", payload: { space: mortgage[0].index } }
    : { action: "bankrupt" };
}
export function chooseDecision(s, p, seed = 0) {
  if (p.bankrupt || s.status !== "active") return null;
  const trade =
    s.phase !== "auction" && (s.trades || []).find((t) => t.recipient === p.id);
  if (trade)
    return {
      action: evaluateTrade(s, p, trade) ? "trade-accept" : "trade-decline",
      payload: { trade: trade.id },
    };
  if (s.phase === "auction") {
    if (s.auction.bidder === p.id) return null;
    const amount = s.auction.bid + 10;
    return amount <= maxBid(s, p, s.auction.space, seed)
      ? { action: "bid", payload: { amount } }
      : null;
  }
  if (s.current_player_id !== p.id) return null;
  if (s.phase === "debt") return chooseDebt(s, p);
  if (s.phase === "awaiting_roll")
    return {
      action:
        p.jailed && p.passes
          ? "jail-pass"
          : p.jailed && p.cash >= reserve + 50
            ? "jail-pay"
            : "roll",
    };
  if (s.phase === "awaiting_purchase")
    return {
      action:
        p.cash - board[s.pending_property].price >= reserve ? "buy" : "skip",
    };
  if (s.phase === "airport") {
    const unowned = board
      .filter((b) => purchasable(b) && !assets(s)[b.index])
      .sort((a, b) => value(s, p.id, b.index) - value(s, p.id, a.index));
    return {
      action: "travel",
      payload: {
        destination:
          unowned[0]?.index ?? board.find((b) => own(s, p.id, b))?.index ?? 0,
      },
    };
  }
  if (s.phase === "event_choice") {
    const space = chooseUpgrade(s, p, true);
    return {
      action: "event-choice",
      payload:
        s.active_event.kind === "target"
          ? {
              player: s.players
                .filter((x) => x.id !== p.id && !x.bankrupt)
                .sort((a, b) => a.cash - b.cash)[0].id,
            }
          : space === undefined
            ? { skip: true }
            : { space },
    };
  }
  if (s.phase === "management") {
    const space = chooseUpgrade(s, p);
    return space === undefined
      ? { action: "end-turn" }
      : { action: "upgrade", payload: { space } };
  }
  return null;
}
