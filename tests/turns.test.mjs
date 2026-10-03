import {before,after,test} from 'node:test';import assert from 'node:assert/strict';import {randomBytes,randomUUID} from 'node:crypto';import {database} from './database.mjs';
let db;before(async()=>db=await database());after(async()=>db?.stop());
async function room(code){const enter=async(action,name)=>{const token=randomBytes(32).toString('hex');return {...await db.rpc('campus_enter',{action,code,name,token}),token};};const h=await enter('create','Host');const g=await enter('join','Guest');h.snapshot=(await act(h,'start')).snapshot;return [h,g];}
function act(p,action,revision=p.snapshot.revision,id=randomUUID()){return db.rpc('campus_action',{session:p.room_session_id,player:p.player_id,token:p.token,action,request:id,revision});}
test('server rolls one die, advances token and turn; duplicate clicks cannot roll twice',async()=>{
 const [h,g]=await room('TRN234');await assert.rejects(()=>act(g,'roll'),/not your turn/);
 const id=randomUUID();const [a,b]=await Promise.all([act(h,'roll',h.snapshot.revision,id),act(h,'roll',h.snapshot.revision,id)]);
 assert.equal(a.snapshot.last_die>=1 && a.snapshot.last_die<=6,true);assert.equal(a.snapshot.players[0].position,a.snapshot.last_die);assert.equal(a.snapshot.current_player_id,a.snapshot.phase==='awaiting_purchase' ? h.player_id : g.player_id);
 assert.equal(a.snapshot.events.filter(e=>/rolled/.test(e.message)).length,1);assert.equal(b.snapshot.players[0].position,a.snapshot.players[0].position);
});
test('START awards $100 once for both exact landing and crossing',async()=>{
 for(const [code,dieWanted] of [['STU234',1],['ZAB234',2]]){
  const [h]=await room(code);await db.pool.query('update campus_private.players set position=19 where id=$1',[h.player_id]);
  const c=await db.pool.connect();let r;
  try{
   // Seed only a disposable test connection; no test controls exist in the public API.
   let seed=0;
   for(let i=0;i<100;i++){seed=i/100;await c.query('select setseed($1)',[seed]);const probe=await c.query('select floor(random()*6)::integer+1 as die');if(probe.rows[0].die===dieWanted)break;}
   await c.query('select setseed($1)',[seed]);await c.query('begin');await c.query('set local role service_role');
   r=(await c.query('select public.campus_action($1,$2,$3,$4,$5,$6) as result',[h.room_session_id,h.player_id,h.token,'roll',randomUUID(),h.snapshot.revision])).rows[0].result;
   await c.query('commit');
  }finally{c.release();}
  assert.equal(r.snapshot.last_die,dieWanted);assert.equal(r.snapshot.players[0].cash,1600);assert.equal(r.snapshot.players[0].position,dieWanted-1);assert.equal(r.snapshot.events.filter(e=>e.message.includes('collected $100')).length,1);
 }
});
test('timeout calls from multiple players only advance once and stale roll does not move',async()=>{
 const [h,g]=await room('VWX234');await db.pool.query("update campus_private.game_state set turn_ends_at=clock_timestamp()-interval '1 second' where room_id=(select id from campus_private.rooms where room_session_id=$1)",[h.room_session_id]);
 const r=await Promise.all([act(h,'advance-turn'),act(g,'advance-turn')]);assert.equal(r[1].snapshot.current_player_id,g.player_id);assert.equal(r[1].snapshot.events.filter(e=>/Turn skipped/.test(e.message)).length,1);
 await assert.rejects(()=>act(h,'roll'),/not your turn/);assert.equal(r[1].snapshot.players[0].position,0);
});

test('stale revisions cannot roll after a full turn cycle',async()=>{
 const [h,g]=await room('CYC234');const stale=h.snapshot.revision;
 h.snapshot=(await act(h,'roll')).snapshot;if(h.snapshot.phase==='awaiting_purchase')h.snapshot=(await act(h,'skip')).snapshot;
 g.snapshot=h.snapshot;g.snapshot=(await act(g,'roll')).snapshot;if(g.snapshot.phase==='awaiting_purchase')g.snapshot=(await act(g,'skip')).snapshot;
 assert.equal(g.snapshot.current_player_id,h.player_id);await assert.rejects(()=>act(h,'roll',stale),/Board changed/);
});
