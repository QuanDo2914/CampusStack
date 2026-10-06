import { useEffect, useRef } from "react";
export function LegacyRulesModal({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="rules-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="rules-title"
    >
      <div className="rules-heading">
        <div>
          <span className="eyebrow">CampusStack field guide</span>
          <h2 id="rules-title">A semester in 15 minutes.</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close rules"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <ol className="rules-list">
        <li>
          <strong>Gather your friends.</strong> Two to four players. The host
          shares a six-character code and starts when at least two players join.
          Everyone begins on START with $1,500.
        </li>
        <li>
          <strong>Roll, then decide.</strong> Roll one six-sided die on your
          turn. Your token moves automatically. Crossing or landing on START
          gives $100 exactly once for that movement.
        </li>
        <li>
          <strong>Build your portfolio.</strong> On an unowned property, buy at
          the listed price or skip. You must have enough cash to buy. Buying or
          skipping ends your turn.
        </li>
        <li>
          <strong>Pay your way.</strong> Landing on someone else’s property
          automatically pays its listed rent. Your own properties charge
          nothing. Fee spaces charge their listed amount.
        </li>
        <li>
          <strong>Read the bulletin.</strong> Each Event draws a random outcome:
          Scholarship +$150, Parking Ticket −$75, Free Coffee +$50, or Campus
          Construction −$100.
        </li>
        <li>
          <strong>Keep it moving.</strong> Each turn lasts 30 seconds, including
          the buy/skip decision. An expired turn is skipped; an undecided
          purchase is skipped. Refreshing keeps your seat. Mandatory charges may
          make your cash negative; you remain in the game.
        </li>
        <li>
          <strong>Finish on top.</strong> The match ends 15 minutes after start.
          Net worth is cash plus the purchase price of your properties. Highest
          net worth wins; tied players share the win.
        </li>
      </ol>
      <p className="fine-print">
        Categories identify campus neighborhoods and do not change rent. One
        roll per turn. No trading, auctions, upgrades, mortgages, selling, or
        elimination.
      </p>
      <button className="primary full" onClick={onClose}>
        Ready to play
      </button>
    </dialog>
  );
}
