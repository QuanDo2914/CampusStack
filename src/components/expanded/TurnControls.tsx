import { campusBoard, character } from "../../lib/expanded";
import { money } from "../../lib/board";
import type { Act, Snapshot, Session } from "../../types/game";
import { Dice } from "./Dice";
import { AuctionPanel } from "./AuctionPanel";
import { EventCard } from "./EventCard";
export function CampusTurnControls({
  snapshot,
  session,
  busy,
  connected,
  seconds,
  onAction,
  onManage,
  onTrade,
}: {
  snapshot: Snapshot;
  session: Session;
  busy: boolean;
  connected: boolean;
  seconds: number;
  onAction: Act;
  onManage: () => void;
  onTrade: () => void;
}) {
  const p = snapshot.players.find((p) => p.id === snapshot.current_player_id)!;
  const me = snapshot.players.find((p) => p.id === session.player_id)!;
  const mine = p.id === me.id;
  const disabled = busy || !connected;
  return (
    <>
      <div className="center-brand">
        CampusStack<span>.</span>
        <small>Buy. Build. Trade. Own the campus.</small>
      </div>
      {snapshot.phase === "auction" ? (
        <AuctionPanel
          key={snapshot.auction?.space}
          snapshot={snapshot}
          playerId={me.id}
          busy={disabled}
          seconds={seconds}
          onAction={onAction}
        />
      ) : (
        <section className="campus-turn">
          <div className="turn-pill">
            {character(p).icon} {mine ? "YOUR TURN" : `${p.name}’s turn`}{" "}
            <span>{seconds}s</span>
          </div>
          <Dice
            values={snapshot.dice}
            busy={busy && snapshot.phase === "awaiting_roll"}
          />
          {snapshot.phase === "awaiting_roll" && (
            <>
              <h2>
                {p.jailed
                  ? "Jailbreak time."
                  : snapshot.extra_roll
                    ? "Doubles! Roll again."
                    : "Make your move."}
              </h2>
              <p>
                {p.jailed
                  ? "Roll doubles to leave. After three attempts, pay $50."
                  : "Roll two dice. Discover your next campus spot."}
              </p>
              {mine && (
                <>
                  <button
                    className="primary"
                    disabled={disabled}
                    onClick={() => onAction("roll")}
                  >
                    {busy
                      ? "Rolling…"
                      : p.jailed
                        ? "Attempt doubles"
                        : "Roll Dice"}
                  </button>
                  {p.jailed && (
                    <div className="action-row">
                      <button
                        className="secondary"
                        disabled={disabled}
                        onClick={() => onAction("jail-pay")}
                      >
                        Pay $50 to leave
                      </button>
                      {Boolean(p.passes) && (
                        <button
                          className="secondary"
                          disabled={disabled}
                          onClick={() => onAction("jail-pass")}
                        >
                          Use Jail pass
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {snapshot.phase === "awaiting_purchase" && (
            <>
              <h2>
                {campusBoard[snapshot.pending_property!].icon}{" "}
                {campusBoard[snapshot.pending_property!].name}
              </h2>
              <p>
                Price {money(campusBoard[snapshot.pending_property!].price)} ·
                Base rent {money(campusBoard[snapshot.pending_property!].rent)}
              </p>
              {mine && (
                <div className="action-row">
                  <button
                    className="primary"
                    disabled={
                      disabled ||
                      p.cash < campusBoard[snapshot.pending_property!].price
                    }
                    onClick={() => onAction("buy")}
                  >
                    Buy {money(campusBoard[snapshot.pending_property!].price)}
                  </button>
                  <button
                    className="secondary"
                    disabled={disabled}
                    onClick={() => onAction("skip")}
                  >
                    Skip → auction
                  </button>
                </div>
              )}
            </>
          )}
          {snapshot.phase === "airport" && (
            <div className="airport-instruction">
              <span>✈️</span>
              <h2>Choose your destination</h2>
              <p>
                {mine
                  ? "Click any highlighted board space to fly there."
                  : "Waiting for a flight destination."}{" "}
                Teleportation gives no START salary.
              </p>
            </div>
          )}
          {snapshot.phase === "management" && (
            <>
              <h2>Build your next chapter.</h2>
              <p>Manage your assets, make a trade, or end your turn.</p>
              {mine && (
                <button
                  className="primary"
                  disabled={disabled}
                  onClick={() => onAction("end-turn")}
                >
                  End turn
                </button>
              )}
            </>
          )}
          {snapshot.phase === "debt" && (
            <>
              <h2>Resolve your debt</h2>
              <p>
                {p.name} owes <strong>{money(snapshot.debt!.amount)}</strong>.
                Mortgage assets, sell upgrades, or trade for cash.
              </p>
              {mine && (
                <div className="action-row">
                  <button
                    className="primary"
                    disabled={disabled || p.cash < snapshot.debt!.amount}
                    onClick={() => onAction("pay-debt")}
                  >
                    Pay debt
                  </button>
                  <button
                    className="danger-button"
                    disabled={disabled || p.cash >= snapshot.debt!.amount}
                    onClick={() => onAction("bankrupt")}
                  >
                    Declare bankruptcy
                  </button>
                </div>
              )}
            </>
          )}
          {snapshot.phase === "event_choice" && (
            <h2>Make your event choice below.</h2>
          )}
        </section>
      )}
      <EventCard
        snapshot={snapshot}
        mine={mine}
        busy={disabled}
        onAction={onAction}
      />
      <div className="center-tools">
        <button className="secondary" onClick={onManage}>
          🏗️ Property manager
        </button>
        <button
          className="secondary"
          disabled={disabled || me.bankrupt || snapshot.phase === "auction"}
          onClick={onTrade}
        >
          🤝 Trade{" "}
          {snapshot.trades?.filter((t) => t.recipient === me.id).length
            ? `(${snapshot.trades.filter((t) => t.recipient === me.id).length})`
            : ""}
        </button>
      </div>
      {!mine && (
        <p className="spectator-note">
          {me.bankrupt
            ? "You’re spectating. Your rivals’ moves stay live."
            : "Watch the board, inspect properties, and propose trades."}
        </p>
      )}
    </>
  );
}
