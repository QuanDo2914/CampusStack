import { useState } from "react";
import { configured } from "../lib/api";
export function HomeScreen({
  busy,
  onEnter,
}: {
  busy: boolean;
  onEnter: (kind: "create" | "join", name: string, code: string) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  return (
    <div className="home-layout">
      <section className="welcome">
        <span className="eyebrow">2–4 friends · One campus</span>
        <h1>
          Make your
          <br />
          campus moves.
        </h1>
        <p>
          Buy the best spots. Collect rent.
          <br />
          Buy. Build. Trade. Own the campus.
        </p>
        <div className="welcome-stats">
          <div>
            <strong>$1,500</strong>
            <span>starting cash</span>
          </div>
          <div>
            <strong>40</strong>
            <span>campus spaces</span>
          </div>
          <div>
            <strong>4 ways</strong>
            <span>to victory</span>
          </div>
        </div>
        <div className="starter-note">
          <span className="note-icon">✦</span>
          <span>A scholarship might change everything.</span>
        </div>
      </section>
      <section className="entry-card">
        <span className="eyebrow">Meet in the quad</span>
        <h2>Let’s get a room.</h2>
        <p>No account needed. Just bring your friends.</p>
        <div className="segmented" aria-label="Room action">
          <button
            aria-pressed={mode === "create"}
            onClick={() => setMode("create")}
          >
            Create room
          </button>
          <button
            aria-pressed={mode === "join"}
            onClick={() => setMode("join")}
          >
            Join room
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && (mode === "create" || code.length === 6))
              onEnter(mode, name, code);
          }}
        >
          <label htmlFor="player-name">Display name</label>
          <input
            id="player-name"
            autoComplete="nickname"
            maxLength={24}
            placeholder="Your campus alias"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {mode === "join" && (
            <>
              <label htmlFor="room-code">Room code</label>
              <input
                id="room-code"
                className="code-input"
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="ABC234"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""),
                  )
                }
              />
            </>
          )}
          <button
            className="primary full"
            disabled={
              busy ||
              !configured ||
              !name.trim() ||
              (mode === "join" && code.length !== 6)
            }
            type="submit"
          >
            {busy
              ? "Connecting…"
              : mode === "create"
                ? "Create a room"
                : "Join the room"}
          </button>
        </form>
        {!configured && (
          <p className="setup-note" role="status">
            Game server not configured. See README for local or Supabase setup.
          </p>
        )}
        <p className="fine-print">
          {mode === "create"
            ? "You’ll get a code to share. Start when at least two players join."
            : "Use the six-character code your host shared."}
        </p>
      </section>
      <div className="quick-rules">
        <div>
          <span>01</span>
          <strong>Roll & explore</strong>
          <p>Two dice. Forty campus spots.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Buy & collect</strong>
          <p>Own a spot and earn rent.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Finish on top</strong>
          <p>Four strategies. One campus champion.</p>
        </div>
      </div>
    </div>
  );
}
