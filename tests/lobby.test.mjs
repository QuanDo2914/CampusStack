import {test,before,after} from 'node:test';import assert from 'node:assert/strict';import {randomBytes,randomUUID} from 'node:crypto';import {database} from './database.mjs';
let db;before(async()=>{db=await database();});after(async()=>{await db?.stop();});
const token=()=>randomBytes(32).toString('hex');
async function enter(action,code,name,t=token()){const r=await db.rpc('campus_enter',{action,code,name,token:t});return {...r,token:t};}
function act(p,action,revision=p.snapshot.revision,id=randomUUID()){return db.rpc('campus_action',{session:p.room_session_id,player:p.player_id,token:p.token,action,request:id,revision});}
test('two players share a room; creation retries recover identity',async()=>{
 const h=await enter('create','ABC234','Quan');const retry=await enter('create','XYZ234','Quan',h.token);assert.equal(h.player_id,retry.player_id);
 const j=await enter('join','ABC234','Alex');assert.equal(h.room_session_id,j.room_session_id);assert.equal(j.snapshot.players.length,2);assert.equal(j.room_session_id.length,64);assert.equal(j.snapshot.players[0].cash,1500);
 assert.equal(JSON.stringify(j.snapshot).includes('token_hash'),false);assert.equal(JSON.stringify(j.snapshot).includes('ABC234'),false);
});
test('concurrent joins cannot overfill a room',async()=>{
 await enter('create','DEF234','Host');const replies=await Promise.allSettled(Array.from({length:8},(_,i)=>enter('join','DEF234',`Player${i}`)));
 assert.equal(replies.filter(x=>x.status==='fulfilled').length,3);assert.equal(replies.filter(x=>x.status==='rejected').length,5);
});
test('invalid code, duplicate name, unauthorized start and one-player start fail',async()=>{
 const h=await enter('create','GHJ234','Host');await assert.rejects(()=>act(h,'start'),/two players/);
 await assert.rejects(()=>enter('join','ZZZ234','Guest'),/Room not found/);
 await assert.rejects(()=>enter('join','GHJ234','host'),/name is already/);
 const j=await enter('join','GHJ234','Guest');await assert.rejects(()=>act(j,'start'),/Only the host/);
 const started=await act(h,'start');assert.equal(started.snapshot.status,'active');assert.equal(Date.parse(started.snapshot.match_ends_at)-Date.parse(started.server_now),900000);assert.equal(Date.parse(started.snapshot.turn_ends_at)-Date.parse(started.server_now),30000);
 await assert.rejects(()=>enter('join','GHJ234','Late'),/already started/);
});
test('RLS denies global enumeration, wrong room claim, browser writes and private actions',async()=>{
 const a=await enter('create','KLM234','A');await enter('create','NPQ234','B');const c=await db.pool.connect();
 try{await c.query('begin');await c.query('set local role anon');assert.equal((await c.query('select * from public.room_snapshots')).rowCount,0);
 await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({room_session_id:a.room_session_id})]);
 const rows=await c.query('select * from public.room_snapshots');assert.equal(rows.rowCount,1);assert.equal(rows.rows[0].room_session_id,a.room_session_id);
 await c.query('savepoint x');await assert.rejects(()=>c.query('delete from public.room_snapshots'),/permission denied/);await c.query('rollback to savepoint x');
 await c.query('savepoint y');await assert.rejects(()=>c.query("select public.campus_enter('create','RST234','X','123')"),/permission denied/);await c.query('rollback to savepoint y');
 await c.query('savepoint z');await assert.rejects(()=>c.query('select * from campus_private.players'),/permission denied/);await c.query('rollback to savepoint z');await c.query('rollback');
 }finally{c.release();}
});
