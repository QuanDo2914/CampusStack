import {board,colors,money} from '../lib/board';import type {Snapshot} from '../types/game';
export function PlayerPanel({snapshot,playerId,now}:{snapshot:Snapshot;playerId:string;now:number}){
 return <aside className="player-panel"><div className="panel-heading"><h2>The players</h2><span>{snapshot.players.length} on campus</span></div>{snapshot.players.map(p=>{
  const owned=board.filter(s=>snapshot.ownership[s.index]===p.id);const current=p.id===snapshot.current_player_id;const offline=now-Date.parse(p.last_seen_at)>40000;
  return <article className={`player-card ${current ? 'current' : ''}`} key={p.id} data-testid={`player-${p.name}`}>
   <div className="player-line"><span className="avatar" style={{background:colors[p.seat]}}>{p.name[0].toUpperCase()}</span><div><strong>{p.name}{p.id===playerId && <span className="you">You</span>}</strong><small>{offline ? 'Away · seat saved' : current ? 'On the move' : 'On campus'}</small></div>{current && <span className="turn-badge">Turn</span>}</div>
   <div className="player-values"><div><span>Cash</span><strong data-testid={`cash-${p.name}`}>{money(p.cash)}</strong></div><div><span>Properties</span><strong>{owned.length}</strong></div></div>
   <div className="property-list">{owned.length ? owned.map(s=><span className={`property-chip ${s.category}`} key={s.index} title={`Purchase ${money(s.price)} · Rent ${money(s.rent)}`}>{s.name}</span>) : <span className="no-properties">A campus portfolio starts with one spot.</span>}</div>
  </article>;
 })}<div className="legend"><h3>Campus neighborhoods</h3>{[['food','Food'],['wellness','Wellness'],['innovation','Innovation'],['housing','Housing'],['arts','Arts']].map(([key,label])=><span key={key}><i className={key}/>{label}</span>)}</div></aside>;
}
