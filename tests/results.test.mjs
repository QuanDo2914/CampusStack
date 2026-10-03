import {before,after,test} from 'node:test';import assert from 'node:assert/strict';import {randomBytes,randomUUID} from 'node:crypto';import {database} from './database.mjs';
let db;before(async()=>db=await database());after(async()=>db?.stop());
async function room(code){const enter=async(action,name)=>{const token=randomBytes(32).toString('hex');return {...await db.rpc('campus_enter',{action,code,name,token}),token};};const h=await enter('create','Quan');const g=await enter('join','Alex');h.snapshot=(await act(h,'start')).snapshot;return [h,g];}
function act(p,action){return db.rpc('campus_action',{session:p.room_session_id,player:p.player_id,token:p.token,action,request:randomUUID(),revision:p.snapshot.revision});}
async function expire(h){await db.pool.query("update campus_private.game_state set match_ends_at=clock_timestamp()-interval '1 second' where room_id=(select room_id from campus_private.players where id=$1)",[h.player_id]);}
test('early finish cannot end the match; simultaneous finish requests finalize once',async()=>{
 const [h,g]=await room('FIN234');const early=await act(h,'finish-game');assert.equal(early.snapshot.status,'active');
 await db.pool.query('insert into campus_private.property_ownership select room_id,6,id from campus_private.players where id=$1',[h.player_id]);
 await db.pool.query('update campus_private.players set cash=1280 where id=$1',[h.player_id]);await expire(h);
 const replies=await Promise.all([act(h,'finish-game'),act(g,'finish-game'),act(h,'finish-game')]);
 for(const r of replies){assert.equal(r.snapshot.status,'finished');assert.equal(r.snapshot.events.filter(e=>/Final scores/.test(e.message)).length,1);assert.equal(r.snapshot.leaderboard.length,2);assert.equal(r.snapshot.leaderboard[0].rank,1);assert.equal(r.snapshot.leaderboard[1].rank,1);assert.equal(r.snapshot.leaderboard[0].net_worth,1500);}
 const again=await act(g,'sync');assert.deepEqual(again.snapshot.leaderboard,replies[0].snapshot.leaderboard);
});
test('expired roll finalizes without moving; pending purchase cannot charge after deadline',async()=>{
 const [h]=await room('END234');await expire(h);const r=await act(h,'roll');assert.equal(r.snapshot.players[0].position,0);assert.equal(r.snapshot.last_die,null);assert.equal(r.snapshot.status,'finished');
 const [p]=await room('DUE234');await db.pool.query('update campus_private.players set position=6 where id=$1',[p.player_id]);await db.pool.query('select campus_private.resolve_landing((select room_id from campus_private.players where id=$1),$1)',[p.player_id]);p.snapshot=(await act(p,'sync')).snapshot;
 await expire(p);const b=await act(p,'buy');assert.equal(b.snapshot.players[0].cash,1500);assert.deepEqual(b.snapshot.ownership,{});assert.equal(b.snapshot.phase,'finished');
});
test('reconnecting sync finalizes an expired match without scheduled jobs',async()=>{
 const [h]=await room('RSM234');await db.pool.query('update campus_private.players set cash=-10 where id=$1',[h.player_id]);await expire(h);const r=await act(h,'sync');assert.equal(r.snapshot.leaderboard[0].name,'Alex');assert.equal(r.snapshot.leaderboard[1].net_worth,-10);
});
