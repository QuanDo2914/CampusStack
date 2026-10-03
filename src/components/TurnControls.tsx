import {board,money} from '../lib/board';import type {Action,Session,Snapshot} from '../types/game';
export function TurnControls({snapshot,session,busy,connected,turnSeconds,onAction}:{snapshot:Snapshot;session:Session;busy:boolean;connected:boolean;turnSeconds:number;onAction:(a:Action)=>void}){
 const current=snapshot.players.find(p=>p.id===snapshot.current_player_id)!;const mine=current.id===session.player_id;const property=snapshot.pending_property===null ? null : board[snapshot.pending_property];
 const disabled=busy || !connected || !mine || turnSeconds===0;
 return <div className="turn-controls"><span className="eyebrow">{mine ? 'Your turn' : 'On the move'} <span className="turn-countdown">{turnSeconds}s</span></span><h2>{mine ? 'Make your move.' : `${current.name}’s turn`}</h2>
 {property ? <><p className="property-offer">{property.name}</p><div className="offer-values"><span>Buy <strong>{money(property.price)}</strong></span><span>Rent <strong>{money(property.rent)}</strong></span></div>
 {mine ? <><button className="primary" disabled={disabled || current.cash<property.price} onClick={()=>onAction('buy')}>{busy ? 'Updating…' : `Buy for ${money(property.price)}`}</button><button className="secondary" disabled={disabled} onClick={()=>onAction('skip')}>Skip property</button>{current.cash<property.price && <p className="fine-print">Not enough cash to purchase. You can skip.</p>}</> : <p className="muted">Choosing whether to buy or skip.</p>}</>
 : <><div className="die" aria-label={snapshot.last_die ? `Last roll ${snapshot.last_die}` : 'Ready to roll'}>{snapshot.last_die ? ['','⚀','⚁','⚂','⚃','⚄','⚅'][snapshot.last_die] : '·'}</div><p className="muted">{mine ? 'Roll one die to explore the campus.' : 'Waiting for their next move.'}</p><button className="primary" disabled={disabled} onClick={()=>onAction('roll')}>{busy ? 'Rolling…' : 'Roll Dice'}</button></>}
 </div>;
}
