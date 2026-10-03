import {money,colors} from '../lib/board';import type {Snapshot} from '../types/game';
export function ResultsScreen({snapshot,onHome}:{snapshot:Snapshot;onHome:()=>void}){
 const scores=snapshot.leaderboard||[];const winners=scores.filter(s=>s.rank===1);
 return <section className="results"><p className="eyebrow">The semester is a wrap</p><h1>{winners.map(w=>w.name).join(' & ')} {winners.length>1 ? 'win together!' : 'wins!'}</h1><p>Final net worth = cash + purchase price of owned properties.</p>
 <div className="leaderboard" role="table" aria-label="Final leaderboard"><div className="score-row score-head" role="row"><span>Player</span><span>Cash</span><span>Properties</span><span>Net worth</span></div>{scores.map(s=><div className={`score-row ${s.rank===1 ? 'winner' : ''}`} role="row" key={s.id}><strong><span className="player-dot" style={{background:colors[s.seat]}}/>#{s.rank} {s.name}</strong><span>{money(s.cash)}</span><span>{money(s.property_value)}</span><strong>{money(s.net_worth)}</strong></div>)}</div>
 <button onClick={onHome}>Back to home</button></section>;
}
