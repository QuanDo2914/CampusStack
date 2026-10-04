import {
  character,
  owned,
  completeGroups,
  victoryLabels,
} from "../../lib/expanded";
import { money } from "../../lib/board";
import { CampusBoard } from "./Board";
import type { Snapshot } from "../../types/game";
export function VictoryScreen({
  snapshot,
  onHome,
}: {
  snapshot: Snapshot;
  onHome: () => void;
}) {
  const winner = snapshot.players.find(
    (p) => p.id === snapshot.winner?.winnerId,
  )!;
  if (!winner)
    return (
      <section className="results">
        <h1>Match complete.</h1>
        <button onClick={onHome}>Back to home</button>
      </section>
    );
  const mine = owned(snapshot, winner.id);
  return (
    <section className="campus-victory">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 36 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${i * 2.8}%`,
              animationDelay: `${(i % 7) * 0.25}s`,
              background: ["#edb94b", "#469a7b", "#b76cd6", "#ef897c"][i % 4],
            }}
          />
        ))}
      </div>
      <span className="victory-character">{character(winner).icon}</span>
      <p className="eyebrow">The campus has a new legend</p>
      <h1>🏆 {winner.name} wins!</h1>
      <h2>{victoryLabels[snapshot.winner!.type]}</h2>
      <p>
        {snapshot.winner?.type === "STRAIGHT_LINE"
          ? `Controlled every purchasable space on the ${["West", "North", "East", "South"][snapshot.winner.side!]} side.`
          : snapshot.winner?.type === "TRANSIT_MONOPOLY"
            ? "Owned all four Campus Transit Stations."
            : snapshot.winner?.type === "PROPERTY_EMPIRE"
              ? "Owned three complete groups, including two developed to Landmarks."
              : "The last active player on campus."}
      </p>
      <div className="victory-stats">
        {[
          ["Cash", money(winner.cash)],
          ["Assets", mine.length],
          ["Complete sets", completeGroups(snapshot, winner.id).length],
          ["Stations", mine.filter((b) => b.kind === "station").length],
          [
            "Upgrades",
            mine.reduce(
              (n, b) => n + (snapshot.assets?.[b.index].level || 0),
              0,
            ),
          ],
          ["Rent collected", money(winner.rent_collected || 0)],
          ["Turns played", winner.turns_played || 0],
        ].map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <button className="primary" onClick={onHome}>
        Back to home
      </button>
      <details>
        <summary>See the final campus</summary>
        <div className="board-scroll">
          <CampusBoard
            snapshot={snapshot}
            canTravel={false}
            onInspect={() => {}}
            onDestination={() => {}}
          >
            <h2>{victoryLabels[snapshot.winner!.type]}</h2>
            <p>
              {winner.name} · {character(winner).icon}
            </p>
          </CampusBoard>
        </div>
      </details>
    </section>
  );
}
