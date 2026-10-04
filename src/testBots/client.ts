import { testBotsEnabled } from "./guard";
import type { Reply, Snapshot } from "../types/game";
export async function testRequest(
  command: string,
  body: Record<string, unknown>,
): Promise<Reply & { player_token?: string }> {
  const url = import.meta.env.VITE_LOCAL_SERVER_URL;
  if (
    !testBotsEnabled ||
    !url ||
    !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  )
    throw Error("Local test bots are disabled");
  const r = await fetch(`${url}/test-bots/${command}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error);
  return data;
}
export type TestSnapshot = Snapshot;
