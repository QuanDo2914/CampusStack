import { VictoryProgress } from "./VictoryProgress";
import { useEffect, useRef, useState } from "react";
import { CampusBoard } from "./Board";
import { CampusTurnControls } from "./TurnControls";
import { CampusPlayerPanel } from "./PlayerPanel";
import { GameLog } from "./GameLog";
import { PropertyCard } from "./PropertyCard";
import { PropertyManager } from "./PropertyManager";
import { TradeModal } from "./TradeModal";
import type { Act, Snapshot, Session } from "../../types/game";
export function ExpandedGame({
  snapshot,
  session,
  busy,
  connected,
  turnSeconds,
  offset,
  onAction,
}: {
  snapshot: Snapshot;
  session: Session;
  busy: boolean;
  connected: boolean;
  turnSeconds: number;
  offset: number;
  onAction: Act;
}) {
  const [inspect, setInspect] = useState<number | null>(null);
  const [manage, setManage] = useState(false);
  const [trade, setTrade] = useState(false);
  const [toast, setToast] = useState("");
  const badges = useRef<string[] | null>(null);
  const me = snapshot.players.find((p) => p.id === session.player_id)!;
  useEffect(() => {
    const next = me.achievements || [];
    const earned = badges.current
      ? next.filter((a) => !badges.current!.includes(a))
      : [];
    if (earned.length) setToast(`✨ ${earned.join(" · ")}`);
    badges.current = next;
  }, [me.achievements?.join(",")]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <>
      <div className="expanded-heading">
        <div>
          <span className="eyebrow">The campus is yours to conquer</span>
          <h1>One board. Four ways to win.</h1>
        </div>
        <span className="game-strategies">
          🏁 Survive · 🧱 Control a side · 🚉 Collect transit · 🏗️ Build an
          empire
        </span>
      </div>
      <div className="expanded-layout">
        <div className="expanded-board-column">
          <div className="mobile-turn-area">
            <CampusTurnControls
              snapshot={snapshot}
              session={session}
              busy={busy}
              connected={connected}
              seconds={turnSeconds}
              onAction={onAction}
              onManage={() => setManage(true)}
              onTrade={() => setTrade(true)}
            />
          </div>
          <p className="scroll-hint">
            Swipe the board to explore all four sides. Tap any property for
            details.
          </p>
          <div className="board-scroll">
            <CampusBoard
              snapshot={snapshot}
              onInspect={setInspect}
              onDestination={(i) => onAction("travel", { destination: i })}
              canTravel={
                snapshot.phase === "airport" &&
                snapshot.current_player_id === me.id &&
                !busy &&
                connected
              }
            >
              <div className="mobile-board-label">
                <h2>CampusStack.</h2>
                <p>
                  Buy. Build. Trade.
                  <br />
                  Own the campus.
                </p>
                <p>{snapshot.events.at(-1)?.message}</p>
              </div>
              <div className="desktop-center-content">
                <CampusTurnControls
                  snapshot={snapshot}
                  session={session}
                  busy={busy}
                  connected={connected}
                  seconds={turnSeconds}
                  onAction={onAction}
                  onManage={() => setManage(true)}
                  onTrade={() => setTrade(true)}
                />
                <VictoryProgress snapshot={snapshot} playerId={me.id} />
              </div>
            </CampusBoard>
          </div>
          <GameLog events={snapshot.events} />
        </div>
        <CampusPlayerPanel
          snapshot={snapshot}
          playerId={me.id}
          onInspect={setInspect}
          now={Date.now() + offset}
        />
      </div>
      {inspect !== null && (
        <PropertyCard
          index={inspect}
          snapshot={snapshot}
          onClose={() => setInspect(null)}
        />
      )}{" "}
      {manage && (
        <PropertyManager
          snapshot={snapshot}
          playerId={me.id}
          busy={busy || !connected || snapshot.phase === "auction"}
          onAction={onAction}
          onClose={() => setManage(false)}
        />
      )}{" "}
      {trade && (
        <TradeModal
          snapshot={snapshot}
          playerId={me.id}
          busy={busy || !connected}
          onAction={onAction}
          onClose={() => setTrade(false)}
        />
      )}{" "}
      {toast && (
        <div className="achievement-toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
