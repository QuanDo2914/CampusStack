import { ExpandedGame } from "./components/expanded/GameScreen";
import { VictoryScreen } from "./components/expanded/VictoryScreen";
import { lazy, Suspense, useState } from "react";
import { useRoom } from "./hooks/useRoom";
import { useMatchClock } from "./hooks/useMatchClock";
import { HomeScreen } from "./components/HomeScreen";
import { LobbyScreen } from "./components/LobbyScreen";
import { GameScreen } from "./components/GameScreen";
import { ResultsScreen } from "./components/ResultsScreen";
import { RulesModal } from "./components/RulesModal";
import { testBotsEnabled } from "./testBots/guard";
const TestBots = import.meta.env.DEV
  ? lazy(() => import("./testBots/TestBots"))
  : null;
export default function App() {
  const game = useRoom();
  const clock = useMatchClock(game.snapshot, game.offset, game.act, game.busy);
  const [testSetup, setTestSetup] = useState(false);
  const [rules, setRules] = useState(false);
  return (
    <main
      className={
        game.snapshot?.status === "active" && game.snapshot.rules_version === 2
          ? "tabletop-app"
          : ""
      }
    >
      <header className="app-header">
        <a className="brand" href="/" aria-label="CampusStack home">
          <span className="brand-mark">
            C<span>▰</span>
          </span>
          <strong>
            CampusStack<span className="brand-period">.</span>
          </strong>
        </a>
        <nav>
          {game.session && (
            <span className="header-code">
              <span>Room </span>
              <strong data-testid="room-code">{game.session.room_code}</strong>
            </span>
          )}
          <button
            className="secondary rules-button"
            onClick={() => setRules(true)}
          >
            Rules <span aria-hidden="true">?</span>
          </button>
        </nav>
      </header>
      {game.session && (
        <div
          className={`connection-bar ${game.connected ? "" : "reconnecting"}`}
          role="status"
        >
          {game.connected
            ? "Connected · Your seat is saved on this device"
            : "Reconnecting… Your seat is saved. Moves resume when connected."}
        </div>
      )}
      {game.error && (
        <div className="error-banner" role="alert">
          <strong>Couldn’t complete that action.</strong>
          <span>{game.error}</span>
        </div>
      )}
      {!game.session ? (
        <>
          <HomeScreen busy={game.busy} onEnter={game.enter} />
          {testBotsEnabled && TestBots && (
            <Suspense fallback={null}>
              <TestBots
                setup={testSetup}
                onOpen={() => setTestSetup(true)}
                onClose={() => setTestSetup(false)}
                busy={game.busy}
                onCreate={game.enterTest}
              />
            </Suspense>
          )}
        </>
      ) : !game.snapshot ? (
        <section className="recovery">
          <h1>Finding your room…</h1>
          <p>Your saved seat will reconnect automatically.</p>
          <button className="secondary" onClick={game.leave}>
            Back to home
          </button>
        </section>
      ) : game.snapshot.status === "lobby" ? (
        <LobbyScreen
          session={game.session}
          snapshot={game.snapshot}
          busy={game.busy}
          connected={game.connected}
          onStart={() => game.act("start")}
          onHome={game.leave}
          onAction={game.act}
        />
      ) : game.snapshot.status === "finished" ? (
        game.snapshot.rules_version === 2 ? (
          <VictoryScreen snapshot={game.snapshot} onHome={game.leave} />
        ) : (
          <ResultsScreen snapshot={game.snapshot} onHome={game.leave} />
        )
      ) : game.snapshot.rules_version === 2 ? (
        <ExpandedGame
          snapshot={game.snapshot}
          session={game.session}
          busy={game.busy}
          connected={game.connected}
          turnSeconds={clock.turnSeconds}
          offset={game.offset}
          onAction={game.act}
        />
      ) : (
        <GameScreen
          snapshot={game.snapshot}
          session={game.session}
          busy={game.busy}
          connected={game.connected}
          matchSeconds={clock.matchSeconds}
          turnSeconds={clock.turnSeconds}
          offset={game.offset}
          onAction={game.act}
        />
      )}
      {testBotsEnabled &&
        TestBots &&
        game.snapshot?.is_test_room &&
        game.session && (
          <Suspense fallback={null}>
            <TestBots
              key={game.session.room_session_id}
              session={game.session}
              snapshot={game.snapshot}
              onReset={game.restoreTest}
            />
          </Suspense>
        )}
      <footer>
        <span>CampusStack · An original campus property game</span>
        <span>2–4 players · Buy. Build. Trade.</span>
      </footer>
      {rules && (
        <RulesModal
          legacy={Boolean(game.snapshot && game.snapshot.rules_version !== 2)}
          onClose={() => setRules(false)}
        />
      )}
    </main>
  );
}
