import type {Session} from '../types/game';
const key='campusstack.session.v1';
export function readSession():Session|null {try {const s=JSON.parse(localStorage.getItem(key)||'null');return s?.player_id && s?.player_token && s?.room_session_id ? s : null;} catch{return null;}}
export function saveSession(s:Session){localStorage.setItem(key,JSON.stringify(s));}
export function clearSession(){localStorage.removeItem(key);}
export function randomSecret(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');}
