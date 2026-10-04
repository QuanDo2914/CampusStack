import { useState, useId } from "react";
import { campusBoard } from "../../lib/expanded";
import { money } from "../../lib/board";
import type { Act, Snapshot } from "../../types/game";
export function AuctionPanel({
  snapshot,
  playerId,
  busy,
  seconds,
  onAction,
}: {
  snapshot: Snapshot;
  playerId: string;
  busy: boolean;
  seconds: number;
  onAction: Act;
}) {
  const id = useId();
  const a = snapshot.auction!;
  const p = snapshot.players.find((p) => p.id === playerId)!;
  const [bid, setBid] = useState(a.bid + 10);
  return (
    <section className="auction-panel" aria-label="Live property auction">
      <span className="eyebrow">Live auction · {seconds}s</span>
      <h2>
        {campusBoard[a.space].icon} {campusBoard[a.space].name}
      </h2>
      <p>
        High bid: <strong>{money(a.bid)}</strong>
        {a.bidder
          ? ` · ${snapshot.players.find((p) => p.id === a.bidder)?.name}`
          : " · No bids yet"}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAction("bid", { amount: Math.max(bid, a.bid + 1) });
        }}
      >
        <label htmlFor={id}>Your bid</label>
        <input
          id={id}
          type="number"
          min={a.bid + 1}
          max={p.cash}
          value={Math.max(bid, a.bid + 1)}
          onChange={(e) => setBid(Number(e.target.value))}
        />
        <button
          className="primary"
          disabled={busy || p.bankrupt || p.cash <= a.bid}
        >
          Place bid
        </button>
      </form>
      <p className="fine-print">
        Everyone can bid, including the player who skipped. The highest bid pays
        when the server clock ends.
      </p>
    </section>
  );
}
