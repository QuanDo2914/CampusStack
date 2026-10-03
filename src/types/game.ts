export interface Player { id:string; name:string; seat:number; cash:number; position:number; last_seen_at:string }
export interface GameEvent {sequence:number;message:string;created_at:string}
export interface Score {id:string;name:string;seat:number;cash:number;property_value:number;net_worth:number;rank:number}
export interface Snapshot {leaderboard?:Score[];room_session_id:string;status:'lobby'|'active'|'finished';host_player_id:string;revision:number;current_player_id:string|null;phase:'awaiting_roll'|'awaiting_purchase'|'finished';pending_property:number|null;last_die:number|null;match_ends_at:string|null;turn_ends_at:string|null;players:Player[];ownership:Record<string,string>;events:GameEvent[]}
export interface Session {player_id:string;room_session_id:string;room_code:string;player_token:string;access_token:string}
export interface Reply {player_id:string;room_session_id:string;room_code?:string;access_token:string;snapshot:Snapshot;server_now:string}
export type Action='sync'|'start'|'roll'|'buy'|'skip'|'advance-turn'|'finish-game';
