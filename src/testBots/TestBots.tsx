import { useState } from "react";
import { testRequest } from "./client";
import type { Session, Snapshot, Reply } from "../types/game";
export default function TestBots({
  setup,
  onOpen,
  onClose,
  busy,
  onCreate,
  session,
  snapshot,
  onReset,
}: {
  setup?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  busy?: boolean;
  onCreate?: (name: string, count: number) => void;
  session?: Session;
  snapshot?: Snapshot;
  onReset?: (r: Reply & { player_token?: string }) => void;
}) {
  const [name, setName] = useState(""),
    [count, setCount] = useState(2),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [paused, setPaused] = useState(snapshot?.test_bots?.paused || false),
    [speed, setSpeed] = useState(snapshot?.test_bots?.speed || "normal");
  async function control(command: string, value?: string) {
    if (!session || pending) return;
    setPending(true);
    setError("");
    try {
      const r = await testRequest("control", {
        player_id: session.player_id,
        player_token: session.player_token,
        room_session_id: session.room_session_id,
        command,
        speed: value,
      });
      if (command === "reset") onReset?.(r);
      else {
        setPaused(r.snapshot.test_bots!.paused);
        setSpeed(r.snapshot.test_bots!.speed);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  if (session && snapshot)
    return (
      <aside className="entry-card" style={{ marginTop: 20, padding: 20 }}>
        <strong>🤖 Local test controls</strong>
        <p>
          Automation only. Normal turn and auction timers continue while bots
          are paused.
        </p>
        <div className="actions">
          <button
            disabled={pending}
            onClick={() => void control(paused ? "resume" : "pause")}
          >
            {paused ? "Resume bots" : "Pause bots"}
          </button>
          <button disabled={pending} onClick={() => void control("skip-delay")}>
            Skip bot delay
          </button>
          <label>
            Bot speed{" "}
            <select
              value={speed}
              disabled={pending}
              onChange={(e) => void control("speed", e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
              <option value="instant">Instant</option>
            </select>
          </label>
          <button disabled={pending} onClick={() => void control("reset")}>
            Reset match
          </button>
        </div>
        <p>
          Reset opens a fresh lobby with the same bot count. Choose a character
          and start again.
        </p>
        {error && <p role="alert">{error}</p>}
      </aside>
    );
  return (
    <section className="entry-card" style={{ marginTop: 20, padding: 24 }}>
      <button className="secondary" onClick={onOpen}>
        🤖 VS COMPUTER — TEST MODE
      </button>
      <p>
        Local development only — play against computer players to test the game.
      </p>
      {setup && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCreate?.(name, count);
          }}
        >
          <label htmlFor="test-name">Your display name</label>
          <input
            id="test-name"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
          />
          <label htmlFor="bot-count">Number of computer players</label>
          <select
            id="bot-count"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          >
            <option value={1}>1 Bot</option>
            <option value={2}>2 Bots</option>
            <option value={3}>3 Bots</option>
          </select>
          <p>
            Current expanded rules. Choose your character in the normal lobby.
          </p>
          <button className="primary" disabled={busy || !name.trim()}>
            Create test room
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </form>
      )}
    </section>
  );
}
