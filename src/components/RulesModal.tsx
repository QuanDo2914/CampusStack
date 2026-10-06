import { Modal } from "./expanded/Modal";
import { LegacyRulesModal } from "./LegacyRulesModal";
export function RulesModal({
  onClose,
  legacy = false,
}: {
  onClose: () => void;
  legacy?: boolean;
}) {
  if (legacy) return <LegacyRulesModal onClose={onClose} />;
  return (
    <Modal
      title="CampusStack field guide"
      onClose={onClose}
      className="campus-rules"
    >
      <p>
        Buy. Build. Trade. Own the campus. Gather 2–4 friends with a room code;
        no login. Start with $1,500, choose a unique character, and pursue one
        of these four routes:
      </p>
      <div className="victory-rules">
        <article>
          <h3>🏁 Last Player Standing</h3>
          <p>Every other player has gone bankrupt.</p>
        </article>
        <article>
          <h3>🧱 Straight-Line Monopoly</h3>
          <p>
            Own every purchasable space on a whole board side, including its
            station. Ignore special spaces. Three in a row is only an
            achievement.
          </p>
        </article>
        <article>
          <h3>🚉 Transit Monopoly</h3>
          <p>Own all four stations.</p>
        </article>
        <article>
          <h3>🏗️ Property Empire</h3>
          <p>
            Own three complete color groups; every property in at least two of
            them must be level 5, unmortgaged Landmarks.
          </p>
        </article>
      </div>
      <ol className="rules-list">
        <li>
          <strong>Roll two dice.</strong> Move their sum. Normal dice movement
          crossing or landing on START pays $100 exactly once. Doubles allow
          another roll after resolving the landing. Three consecutive doubles in
          a turn send you to Jail.
        </li>
        <li>
          <strong>Buy or auction.</strong> Buy an unowned property/station with
          available cash, or skip to open a 30-second auction. All active
          players may bid; highest available-cash bid wins at the server
          deadline. No bids leaves it unowned.
        </li>
        <li>
          <strong>Pay rent.</strong> Rent transfers automatically. Stations
          charge $25/$50/$100/$200 with 1/2/3/4 stations. A complete unmortgaged
          color group doubles undeveloped base rent. Your own and mortgaged
          assets collect no rent.
        </li>
        <li>
          <strong>Build an empire.</strong> Open Property manager any time on
          your turn. A complete unmortgaged group unlocks levels 1–5. Build the
          least-developed property first; sell the most-developed first. Level
          names: Renovation, Expansion, Campus Hub, Major Complex, Landmark.
          Rent and upgrade costs appear on property cards.
        </li>
        <li>
          <strong>Trade with rivals.</strong> Offer properties, stations, cash,
          or combinations. Your recipient may accept, decline or counter. The
          server rechecks cash and ownership at acceptance. Sell every building
          in a group before trading its properties. Mortgages transfer with
          assets.
        </li>
        <li>
          <strong>Raise cash.</strong> Sell upgrades for half their cost.
          Mortgage an asset for half its purchase price after selling group
          upgrades. Unmortgage for mortgage value + 10%. Sell undeveloped assets
          to the bank for mortgage value; an already mortgaged sale pays $0.
        </li>
        <li>
          <strong>Resolve debts.</strong> Mandatory charges pause play when you
          cannot pay. Raise cash, trade, then Pay debt, or declare bankruptcy.
          Cash never becomes negative. Bankruptcy transfers cash/assets to a
          player creditor; bank debts return assets to the bank. Eliminated
          players spectate.
        </li>
        <li>
          <strong>Jail and visiting.</strong> Go To Jail, security events and
          three doubles imprison you. Visitors are free. Roll doubles to leave,
          pay $50 before rolling, or use a Jail pass. A third failed attempt
          requires $50 and then moves that roll. Leaving with doubles does not
          earn an extra roll. Jail transfers never pay START.
        </li>
        <li>
          <strong>Take a flight.</strong> Airport is the top-left corner. Click
          any other board space to teleport. Resolve the destination normally:
          buy, pay rent, event, fee or Jail. Flying to START or across it never
          pays salary. Airport cannot be bought. Parking Commons is a restful
          edge space.
        </li>
        <li>
          <strong>Read campus news.</strong> Thirty cards give cash, charge
          fees, move tokens, send you to Jail, award passes, grants and one-use
          rent bonuses/protection, or involve other players. Event movement
          gives no START salary. Birthday Fund collects up to each player’s
          available cash. Renovation grants follow complete-set/even-building
          rules and may be skipped.
        </li>
        <li>
          <strong>Keep the campus moving.</strong> Each decision has a 30-second
          inactivity clock. An undecided purchase becomes an auction. Inactive
          turns move on. A timed-out debt automatically sells upgrades and
          mortgages assets before paying or declaring bankruptcy. Refresh keeps
          your saved seat; a reconnect syncs authoritative state.
        </li>
        <li>
          <strong>Choose your strategy.</strong> There is no net-worth timer
          winner under the expanded rules. The match ends instantly on one of
          the four victories above. Achievements celebrate progress and never
          add win conditions.
        </li>
      </ol>
      <button className="primary full" onClick={onClose}>
        Ready to play
      </button>
    </Modal>
  );
}
