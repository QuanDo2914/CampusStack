import { useState } from "react";
import { campusBoard, owned, character } from "../../lib/expanded";
import { money } from "../../lib/board";
import type { Act, Snapshot, Trade } from "../../types/game";
import { Modal } from "./Modal";
export function TradeModal({
  snapshot,
  playerId,
  busy,
  onAction,
  onClose,
}: {
  snapshot: Snapshot;
  playerId: string;
  busy: boolean;
  onAction: Act;
  onClose: () => void;
}) {
  const others = snapshot.players.filter(
    (p) => p.id !== playerId && !p.bankrupt,
  );
  const [recipient, setRecipient] = useState(others[0]?.id || "");
  const [give, setGive] = useState<number[]>([]);
  const [take, setTake] = useState<number[]>([]);
  const [giveCash, setGiveCash] = useState(0);
  const [takeCash, setTakeCash] = useState(0);
  const [counter, setCounter] = useState<string | null>(null);
  const toggle = (n: number, values: number[], setter: (v: number[]) => void) =>
    setter(values.includes(n) ? values.filter((x) => x !== n) : [...values, n]);
  const display = (indices: number[], cash: number) =>
    `${indices.map((i) => campusBoard[i].name).join(", ")}${cash ? `${indices.length ? " + " : ""}${money(cash)}` : ""}` ||
    "Nothing";
  function counterOffer(t: Trade) {
    setCounter(t.id);
    setRecipient(t.sender);
    setGive(t.take_spaces);
    setTake(t.give_spaces);
    setGiveCash(t.take_cash);
    setTakeCash(t.give_cash);
  }
  return (
    <Modal title="Campus trading desk" onClose={onClose}>
      <p>
        Offer assets and cash. The other player can accept, decline, or counter.
        Buildings in a group must be sold before trading its assets.
      </p>
      <div className="trade-inbox">
        {snapshot.trades
          ?.filter((t) => t.sender === playerId || t.recipient === playerId)
          .map((t) => (
            <article key={t.id}>
              <h3>
                {snapshot.players.find((p) => p.id === t.sender)?.name} →{" "}
                {snapshot.players.find((p) => p.id === t.recipient)?.name}
              </h3>
              <p>
                Give: {display(t.give_spaces, t.give_cash)}
                <br />
                Receive: {display(t.take_spaces, t.take_cash)}
              </p>
              <div className="action-row">
                {t.recipient === playerId ? (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => onAction("trade-accept", { trade: t.id })}
                    >
                      Accept
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => onAction("trade-decline", { trade: t.id })}
                    >
                      Decline
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => counterOffer(t)}
                    >
                      Counter
                    </button>
                  </>
                ) : (
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => onAction("trade-cancel", { trade: t.id })}
                  >
                    Cancel offer
                  </button>
                )}
              </div>
            </article>
          ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAction(counter ? "trade-counter" : "trade-offer", {
            recipient,
            give_spaces: give,
            take_spaces: take,
            give_cash: giveCash,
            take_cash: takeCash,
            ...(counter ? { trade: counter } : {}),
          });
          setCounter(null);
          setGive([]);
          setTake([]);
          setGiveCash(0);
          setTakeCash(0);
        }}
      >
        <label>
          Trade with
          <select
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              setTake([]);
              setCounter(null);
            }}
          >
            {others.map((p) => (
              <option value={p.id} key={p.id}>
                {character(p).icon} {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="trade-columns">
          {[
            {
              title: "You give",
              id: playerId,
              values: give,
              setter: setGive,
              cash: giveCash,
              setCash: setGiveCash,
            },
            {
              title: "You receive",
              id: recipient,
              values: take,
              setter: setTake,
              cash: takeCash,
              setCash: setTakeCash,
            },
          ].map((col) => (
            <fieldset key={col.title}>
              <legend>{col.title}</legend>
              {owned(snapshot, col.id).map((b) => (
                <label key={b.index}>
                  <input
                    type="checkbox"
                    checked={col.values.includes(b.index)}
                    onChange={() => toggle(b.index, col.values, col.setter)}
                  />
                  {b.icon} {b.name}
                  {snapshot.assets?.[b.index].mortgaged ? " Ⓜ" : ""}
                </label>
              ))}
              <label>
                Cash
                <input
                  type="number"
                  min={0}
                  max={snapshot.players.find((p) => p.id === col.id)?.cash || 0}
                  value={col.cash}
                  onChange={(e) => col.setCash(Number(e.target.value))}
                />
              </label>
            </fieldset>
          ))}
        </div>
        <button
          className="primary"
          disabled={
            busy ||
            !recipient ||
            give.length + take.length + giveCash + takeCash === 0
          }
          type="submit"
        >
          {counter ? "Send counteroffer" : "Send offer"}
        </button>
      </form>
    </Modal>
  );
}
