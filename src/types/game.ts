export interface Player {
  id: string;
  name: string;
  seat: number;
  cash: number;
  position: number;
  last_seen_at: string;
  character?: string;
  jailed?: boolean;
  jail_attempts?: number;
  bankrupt?: boolean;
  passes?: number;
  shield?: boolean;
  rent_bonus?: boolean;
  rent_collected?: number;
  turns_played?: number;
  achievements?: string[];
}
export interface GameEvent {
  sequence: number;
  message: string;
  created_at: string;
}
export interface Score {
  id: string;
  name: string;
  seat: number;
  cash: number;
  property_value: number;
  net_worth: number;
  rank: number;
}
export interface Snapshot {
  rules_version?: number;
  dice?: number[];
  doubles?: number;
  extra_roll?: boolean;
  started_at?: string;
  winner?: Victory | null;
  assets?: Record<string, Asset>;
  trades?: Trade[];
  auction?: Auction | null;
  debt?: Debt | null;
  active_event?: CampusEvent | null;
  movement?: Movement | null;
  leaderboard?: Score[];
  room_session_id: string;
  status: "lobby" | "active" | "finished";
  host_player_id: string;
  revision: number;
  current_player_id: string | null;
  phase:
    | "awaiting_roll"
    | "awaiting_purchase"
    | "finished"
    | "management"
    | "airport"
    | "auction"
    | "debt"
    | "event_choice";
  pending_property: number | null;
  last_die: number | null;
  match_ends_at: string | null;
  turn_ends_at: string | null;
  players: Player[];
  ownership: Record<string, string>;
  events: GameEvent[];
}
export interface Session {
  player_id: string;
  room_session_id: string;
  room_code: string;
  player_token: string;
  access_token: string;
}
export interface Reply {
  player_id: string;
  room_session_id: string;
  room_code?: string;
  access_token: string;
  snapshot: Snapshot;
  server_now: string;
}
export type Action =
  | "sync"
  | "start"
  | "roll"
  | "buy"
  | "skip"
  | "advance-turn"
  | "finish-game"
  | "character"
  | "end-turn"
  | "travel"
  | "bid"
  | "upgrade"
  | "downgrade"
  | "mortgage"
  | "unmortgage"
  | "sell"
  | "jail-pay"
  | "jail-pass"
  | "pay-debt"
  | "bankrupt"
  | "event-choice"
  | "trade-offer"
  | "trade-counter"
  | "trade-accept"
  | "trade-decline"
  | "trade-cancel";

export type Payload = Record<string, unknown>;
export type Act = (action: Action, payload?: Payload) => void;
export interface Asset {
  owner: string;
  level: number;
  mortgaged: boolean;
}
export interface Victory {
  winnerId: string;
  type:
    | "LAST_PLAYER_STANDING"
    | "STRAIGHT_LINE"
    | "TRANSIT_MONOPOLY"
    | "PROPERTY_EMPIRE";
  side: number | null;
}
export interface Auction {
  space: number;
  bid: number;
  bidder: string | null;
  ends_at: string;
}
export interface Debt {
  player: string;
  creditor: string | null;
  amount: number;
  resume: string;
}
export interface Trade {
  id: string;
  sender: string;
  recipient: string;
  give_spaces: number[];
  take_spaces: number[];
  give_cash: number;
  take_cash: number;
}
export interface CampusEvent {
  id: number;
  name: string;
  kind: string;
  value: number;
  icon: string;
  description: string;
}
export interface Movement {
  player: string;
  type: "walk" | "flight" | "event" | "jail";
  from?: number;
  to: number;
  steps?: number;
}
