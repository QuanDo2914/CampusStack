import { useState } from 'react';
import { ExpandedGame } from '../components/expanded/GameScreen';
import { RulesModal } from '../components/RulesModal';
import { tileFixture } from './TileLab';
import type { Snapshot } from '../types/game';
// Read-only fixture; never creates a room, persists identity or invokes game actions.
const preview: Snapshot = {...tileFixture, dice:[4,2], players:tileFixture.players.map((p,i)=>({...p,name:['Quan','Alex','Jordan','Sam'][i],cash:[1250,1870,930,1100][i],position:[18,1,24,35][i]})),events:[{sequence:1,message:'Scene preview · original campus miniatures and 40 playable spaces.',created_at:new Date().toISOString()}]};
export default function TabletopPreview() {
  const [rules,setRules] = useState(false);
  return <main className="tabletop-app">
    <header className="app-header"><a className="brand" href="/" aria-label="CampusStack home"><span className="brand-mark">C<span>▰</span></span><strong>CampusStack<span className="brand-period">.</span></strong></a><nav><a href="/">Play locally</a><button className="secondary rules-button" onClick={()=>setRules(true)}>Rules <span aria-hidden="true">?</span></button></nav></header>
    <div className="connection-bar" role="status">Development scene preview · read-only · no room or server access</div>
    <ExpandedGame snapshot={preview} session={{player_id:preview.players[0].id,room_session_id:'visual-fixture',room_code:'PREVIEW',player_token:'',access_token:''}} busy={false} connected={false} turnSeconds={30} offset={0} onAction={async()=>{}} />
    {rules && <RulesModal onClose={()=>setRules(false)}/>}
  </main>;
}
