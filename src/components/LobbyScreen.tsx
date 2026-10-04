import {useState} from 'react';import {colors} from '../lib/board';import type {Session,Snapshot} from '../types/game';
export function LobbyScreen({session,snapshot,busy,connected,onStart,onHome}:{session:Session;snapshot:Snapshot;busy:boolean;connected:boolean;onStart:()=>void;onHome:()=>void}){
 const [copied,setCopied]=useState(false);const host=session.player_id===snapshot.host_player_id;
 return <section className="lobby"><span className="eyebrow">Your room is open</span><h1>Meet in the quad.</h1><p>Share this code. Your friends can join from their own devices.</p>
 <div className="room-code-block"><span>ROOM CODE</span><strong>{session.room_code}</strong><button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(session.room_code);setCopied(true);}catch{setCopied(false);}}}>{copied ? 'Copied!' : 'Copy code'}</button></div>
 <div className="lobby-roster" aria-label="Players in room">{[0,1,2,3].map(seat=>{
  const p=snapshot.players.find(p=>p.seat===seat);return <div className={`lobby-seat ${p ? '' : 'empty'}`} key={seat}>{p ? <><span className="avatar" style={{background:colors[seat]}}>{p.name[0].toUpperCase()}</span><strong>{p.name}</strong><span className="muted">{p.id===snapshot.host_player_id ? 'Host' : 'Ready'}{p.id===session.player_id ? ' · You' : ''}</span></> : <><span className="avatar empty-avatar">+</span><strong>Open seat</strong><span className="muted">Waiting for a friend</span></>}</div>;
 })}</div>
 <div className="lobby-bottom"><span>{snapshot.players.length}/4 players · $1,500 each · 15 minutes</span>{host ? <button className="primary" disabled={busy || !connected || snapshot.players.length<2} onClick={onStart}>{busy ? 'Starting…' : 'Start match'}</button> : <p>Waiting for the host to start.</p>}</div>
 {host && snapshot.players.length<2 && <p className="fine-print">One more friend and you’re ready to play.</p>}
 <button className="secondary" disabled={busy} onClick={onHome}>Back to home</button></section>;
}
