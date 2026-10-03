import {useTokenPositions} from '../hooks/useTokenPositions';import {board,colors,gridPosition,money} from '../lib/board';import type {Snapshot} from '../types/game';
export function Board({snapshot,children}:{snapshot:Snapshot;children:React.ReactNode}){
 const positions=useTokenPositions(snapshot.players);
 return <div className="board" aria-label="Campus game board">{board.map(space=>{
  const [col,row]=gridPosition(space.index);const owner=snapshot.players.find(p=>p.id===snapshot.ownership[space.index]);
  return <div key={space.index} className={`space ${space.category} ${snapshot.pending_property===space.index ? 'pending' : ''}`} style={{'--col':col,'--row':row} as React.CSSProperties} data-testid={`space-${space.index}`}>
   <span className="space-kind">{space.kind==='property' ? space.category : space.kind==='start' ? '+$100' : space.kind}</span><strong title={space.name}><span className="space-name-full">{space.name}</span><span className="space-name-short">{space.shortName || space.name}</span></strong>
   <span className="space-value">{space.kind==='property' ? money(space.price) : space.kind==='fee' ? `−${money(space.fee)}` : space.kind==='event' ? 'Draw an event' : 'Every lap'}</span>
   {owner && <span className="owner" style={{background:colors[owner.seat]}} title={`Owned by ${owner.name}`}>{owner.name}</span>}
   <div className="tokens">{snapshot.players.filter(p=>(positions[p.id] ?? p.position)===space.index).map(p=><span key={p.id} className="token" style={{background:colors[p.seat]}} title={p.name} aria-label={`${p.name} at ${space.name}`}>{p.name[0].toUpperCase()}</span>)}</div>
  </div>;
 })}<div className="quad">{children}</div></div>;
}
