import { useCallback, useEffect, useRef, useState } from "react";
import { action, send, subscribe } from "../lib/api";
import {
  clearSession,
  randomSecret,
  readSession,
  saveSession,
} from "../lib/session";
import type { Action, Reply, Session, Snapshot } from "../types/game";
export function useRoom() {
  const [session, setSession] = useState<Session | null>(readSession);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionEpoch, setConnectionEpoch] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const lock = useRef(false);
  const state = useRef(snapshot);
  state.current = snapshot;
  const accept = useCallback(
    (next: Snapshot) =>
      setSnapshot((old) =>
        !old || next.revision >= old.revision ? next : old,
      ),
    [],
  );
  const acceptReply = useCallback(
    (r: Reply, s: Session) => {
      accept(r.snapshot);
      setOffset(Date.parse(r.server_now) - Date.now());
      setSession((current) => {
        if (!current || current.player_id !== s.player_id) return current;
        let expires = 0;
        try {
          expires =
            JSON.parse(
              atob(
                current.access_token
                  .split(".")[1]
                  .replace(/-/g, "+")
                  .replace(/_/g, "/"),
              ),
            ).exp * 1000;
        } catch {}
        if (expires - Date.now() > 600000) return current;
        const updated = { ...current, access_token: r.access_token };
        saveSession(updated);
        return updated;
      });
    },
    [accept],
  );
  useEffect(() => {
    if (!session) return;
    return subscribe(session, accept, setConnected);
  }, [session, accept, connectionEpoch]);
  useEffect(() => {
    if (!session || connected) return;
    const timer = setTimeout(() => setConnectionEpoch((n) => n + 1), 3000);
    return () => clearTimeout(timer);
  }, [session, connected, connectionEpoch]);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    const sync = () =>
      action(session, "sync", state.current?.revision || 0)
        .then((r) => {
          if (alive) {
            acceptReply(r, session);
            setError("");
          }
        })
        .catch((e) => {
          if (alive) {
            setConnected(false);
            setError(e.message);
          }
        });
    void sync();
    const timer = setInterval(sync, 15000);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
    };
  }, [session?.player_id, session?.room_session_id, acceptReply]);
  async function enter(kind: "create" | "join", name: string, code: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const pendingKey = "campusstack.pending-entry";
    let token = randomSecret();
    try {
      const old = JSON.parse(localStorage.getItem(pendingKey) || "null");
      if (old?.kind === kind && old?.name === name && old?.code === code)
        token = old.token;
      localStorage.setItem(
        pendingKey,
        JSON.stringify({ kind, name, code, token }),
      );
      const r = await send({
        action: kind,
        name,
        code,
        player_token: token,
        rules_version: 2,
      });
      const s: Session = {
        player_id: r.player_id,
        room_session_id: r.room_session_id,
        room_code: r.room_code!,
        player_token: token,
        access_token: r.access_token,
      };
      saveSession(s);
      localStorage.removeItem(pendingKey);
      setSession(s);
      acceptReply(r, s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function act(a: Action, payload: Record<string, unknown> = {}) {
    if (!session || !state.current || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const revision = state.current.revision;
    const id = crypto.randomUUID();
    try {
      let r: Reply;
      try {
        r = await action(session, a, revision, id, payload);
      } catch (e) {
        if (!(e instanceof TypeError) && (e as Error).name !== "TimeoutError")
          throw e;
        r = await action(session, a, revision, id, payload);
      }
      acceptReply(r, session);
    } catch (e) {
      setError((e as Error).message);
      void action(session, "sync", revision)
        .then((r) => acceptReply(r, session))
        .catch(() => {});
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function leave() {
    clearSession();
    setSession(null);
    setSnapshot(null);
    setError("");
    setConnected(false);
  }
  return {
    session,
    snapshot,
    connected,
    busy,
    error,
    offset,
    enter,
    act,
    leave,
  };
}
