import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Action, Reply, Session, Snapshot } from "../types/game";
const local = import.meta.env.DEV && import.meta.env.VITE_LOCAL_SERVER_URL;
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(
  local || (url && key && !url.includes("your-project")),
);
const endpoint = local ? `${local}/action` : `${url}/functions/v1/game-api`;
export async function send(body: Record<string, unknown>): Promise<Reply> {
  if (!configured)
    throw new Error(
      "CampusStack needs a game server. Follow the setup instructions to connect Supabase or start the local server.",
    );
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(local ? {} : { apikey: key }),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "The game server is unavailable");
  return data;
}
export function action(
  s: Session,
  a: Action,
  revision: number,
  request_id = crypto.randomUUID(),
  payload: Record<string, unknown> = {},
) {
  return send({
    action: a,
    revision,
    request_id,
    player_id: s.player_id,
    player_token: s.player_token,
    room_session_id: s.room_session_id,
    payload,
  });
}
export function subscribe(
  s: Session,
  onSnapshot: (s: Snapshot) => void,
  onConnection: (s: boolean) => void,
) {
  if (local) {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${local}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: s.access_token,
            room_session_id: s.room_session_id,
          }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body)
          throw new Error("Stream unavailable");
        onConnection(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let end;
          while ((end = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            if (frame.startsWith("data: "))
              onSnapshot(JSON.parse(frame.slice(6)));
          }
        }
        onConnection(false);
      } catch {
        if (!controller.signal.aborted) onConnection(false);
      }
    })();
    return () => controller.abort();
  }
  let client: SupabaseClient | undefined;
  let alive = true;
  void (async () => {
    client = createClient(url, key, {
      accessToken: async () => s.access_token,
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await client.realtime.setAuth(s.access_token);
    if (!alive) {
      await client.removeAllChannels();
      return;
    }
    client
      .channel(`room:${s.room_session_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_snapshots",
          filter: `room_session_id=eq.${s.room_session_id}`,
        },
        (payload) => onSnapshot(payload.new.snapshot as Snapshot),
      )
      .subscribe((status) => {
        if (!alive) return;
        onConnection(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED")
          void client!
            .from("room_snapshots")
            .select("snapshot")
            .eq("room_session_id", s.room_session_id)
            .single()
            .then(({ data, error }) => {
              if (data) onSnapshot(data.snapshot);
              if (error) onConnection(false);
            });
      });
  })().catch(() => onConnection(false));
  return () => {
    alive = false;
    void client?.removeAllChannels();
  };
}
