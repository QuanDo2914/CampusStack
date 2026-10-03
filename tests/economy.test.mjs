import {before,after,test} from 'node:test';import assert from 'node:assert/strict';import {randomBytes,randomUUID} from 'node:crypto';import {database} from './database.mjs';
let db;before(async()=>db=await database());after(async()=>db?.stop());
async function room(code){const enter=async(action,name)=>{const token=randomBytes(32).toString('hex');return {...await db.rpc('campus_enter',{action,code,name,token}),token};};const h=await enter('create','Quan');const g=await enter('join','Alex');h.snapshot=(await act(h,'start')).snapshot;return [h,g];}
function act(p,action,revision=p.snapshot.revision,id=randomUUID()){return db.rpc('campus_action',{session:p.room_session_id,player:p.player_id,token:p.token,action,request:id,revision});}
async function land(p,position){await db.pool.query('update campus_private.players set position=$1 where id=$2',[position,p.player_id]);await db.pool.query('select campus_private.resolve_landing((select room_id from campus_private.players where id=$1),$1)',[p.player_id]);p.snapshot=(await act(p,'sync')).snapshot;}
test('buy is transactional and idempotent; insufficient cash and wrong player fail',async()=>{
 const [h,g]=await room('BUY234');await land(h,6);await assert.rejects(()=>act(g,'buy'),/not your turn/);
 await db.pool.query('update campus_private.players set cash=219 where id=$1',[h.player_id]);await assert.rejects(()=>act(h,'buy'),/enough cash/);
 assert.equal((await db.pool.query('select * from campus_private.property_ownership')).rows.length,0);
 await db.pool.query('update campus_private.players set cash=1500 where id=$1',[h.player_id]);const id=randomUUID();const a=await act(h,'buy',h.snapshot.revision,id);const b=await act(h,'buy',h.snapshot.revision,id);
 assert.equal(a.snapshot.players[0].cash,1280);assert.equal(b.snapshot.players[0].cash,1280);assert.equal(a.snapshot.ownership['6'],h.player_id);assert.equal(a.snapshot.current_player_id,g.player_id);assert.equal(a.snapshot.events.filter(e=>/bought Campus Gym/.test(e.message)).length,1);
});
test('rent transfers full amount into negative cash; own property charges nothing',async()=>{
 const [h,g]=await room('RNT234');await land(h,6);h.snapshot=(await act(h,'buy')).snapshot;
 await db.pool.query('update campus_private.players set cash=10 where id=$1',[g.player_id]);await land(g,6);assert.equal(g.snapshot.players[1].cash,-35);assert.equal(g.snapshot.players[0].cash,1325);
 await land(h,6);assert.equal(h.snapshot.players[0].cash,1325);
});
test('skip preserves cash/ownership and expired purchase skips once',async()=>{
 const [h,g]=await room('SKP234');await land(h,4);const r=await act(h,'skip');assert.equal(r.snapshot.players[0].cash,1500);assert.deepEqual(r.snapshot.ownership,{});assert.equal(r.snapshot.current_player_id,g.player_id);
 await land(g,8);await db.pool.query("update campus_private.game_state set turn_ends_at=clock_timestamp()-interval '1 second' where room_id=(select room_id from campus_private.players where id=$1)",[g.player_id]);
 const a=await act(h,'advance-turn');assert.equal(a.snapshot.phase,'awaiting_roll');assert.equal(a.snapshot.current_player_id,h.player_id);assert.deepEqual(a.snapshot.ownership,{});assert.equal(a.snapshot.events.filter(e=>/Purchase skipped/.test(e.message)).length,1);
});
test('fees and event outcomes resolve on the server and allow negative balances',async()=>{
 const [h]=await room('EVT234');await db.pool.query('update campus_private.players set cash=0 where id=$1',[h.player_id]);await land(h,7);assert.equal(h.snapshot.players[0].cash,-60);
 for(let i=0;i<20;i++){const before=h.snapshot.players[0].cash;await land(h,3);assert.ok([150,-75,50,-100].includes(h.snapshot.players[0].cash-before));}
});
