import {test,before,after} from 'node:test';import assert from 'node:assert/strict';import {randomBytes,randomUUID} from 'node:crypto';import {jwtVerify,generateKeyPair,exportJWK,decodeProtectedHeader} from 'jose';import {database} from './database.mjs';import {makeHandler} from '../supabase/functions/game-api/handler.mjs';
import {readFile} from 'node:fs/promises';import ts from 'typescript';
let db;const signingSecret=randomBytes(32).toString('hex');let handler;before(async()=>{db=await database();handler=makeHandler({rpc:db.rpc,env:name=>name==='CAMPUS_JWT_SECRET' ? signingSecret : undefined});});after(async()=>db?.stop());
async function call(b,origin='http://localhost:5173'){const r=await handler(new Request('http://local/action',{method:'POST',headers:{'Content-Type':'application/json',origin,'x-forwarded-for':randomUUID()},body:JSON.stringify(b)}));return {status:r.status,data:await r.json()};}
test('entry issues signed room claim, never player secret or server key',async()=>{
 const token=randomBytes(32).toString('hex');const r=await call({action:'create',name:'Host',player_token:token});assert.equal(r.status,200);const {payload}=await jwtVerify(r.data.access_token,new TextEncoder().encode(signingSecret));assert.equal(payload.room_session_id,r.data.room_session_id);assert.equal(payload.role,'anon');assert.equal(payload.sub,r.data.player_id);assert.ok(payload.exp-payload.iat<=3600);assert.equal(JSON.stringify(r.data).includes(token),false);assert.equal(JSON.stringify(r.data).includes(signingSecret),false);
 const wrong=await call({action:'sync',revision:0,request_id:randomUUID(),player_id:r.data.player_id,room_session_id:r.data.room_session_id,player_token:randomBytes(32).toString('hex')});assert.equal(wrong.status,400);assert.match(wrong.data.error,/Invalid player/);
});
test('rejects malformed actions and disallowed origins',async()=>{
 const token=randomBytes(32).toString('hex');assert.equal((await call({action:'create',name:'H',player_token:token},'https://evil.example')).status,403);assert.equal((await call({action:'create',name:'',player_token:token})).status,400);assert.equal((await call({action:'join',name:'Guest',code:'bad',player_token:token})).status,400);assert.equal((await call({action:'roll',player_token:token,room_session_id:'bad',player_id:'bad'})).status,400);
});
test('rate limiting is transactional and sync does not change gameplay revision',async()=>{
 for(let i=0;i<3;i++)assert.equal(await db.rpc('campus_rate_limit',{key:'test-key',limit:3}),true);assert.equal(await db.rpc('campus_rate_limit',{key:'test-key',limit:3}),false);
 const token=randomBytes(32).toString('hex');const e=await db.rpc('campus_enter',{action:'create',code:'SYN234',name:'Sync',token});const r=await db.rpc('campus_action',{session:e.room_session_id,player:e.player_id,token,action:'sync',request:randomUUID(),revision:e.snapshot.revision});assert.equal(r.snapshot.revision,e.snapshot.revision);
});

test('imported ES256 JWK signs room JWTs with the matching key id',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('ES256',{extractable:true});const jwk={...await exportJWK(privateKey),kid:randomUUID(),key_ops:['sign','verify']};
 const handler=makeHandler({rpc:db.rpc,env:name=>name==='CAMPUS_JWT_JWK' ? JSON.stringify(jwk) : undefined});
 const response=await handler(new Request('http://local/action',{method:'POST',headers:{origin:'http://localhost:5173','x-forwarded-for':randomUUID()},body:JSON.stringify({action:'create',name:'ES256',player_token:randomBytes(32).toString('hex')})}));assert.equal(response.status,200);
 const data=await response.json();assert.equal(decodeProtectedHeader(data.access_token).kid,jwk.kid);const {payload}=await jwtVerify(data.access_token,publicKey);assert.equal(payload.room_session_id,data.room_session_id);assert.equal(payload.role,'anon');
});

test('fresh create persists the returned session and syncs it; diagnostics omit secrets',async()=>{
 const logs=[];const info=console.info;const error=console.error;const storage=new Map();
 const previousStorage=globalThis.localStorage;
 globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 console.info=(...args)=>logs.push(args);console.error=(...args)=>logs.push(args);
 try{
  const source=await readFile(new URL('../src/lib/session.ts',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
  const {readSession,saveSession}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  assert.equal(readSession(),null);
  const token=randomBytes(32).toString('hex');const created=await call({action:'create',name:'Fresh',code:'',player_token:token});
  assert.equal(created.status,200);assert.match(created.data.room_session_id,/^[a-f0-9]{64}$/);
  const s={player_id:created.data.player_id,room_session_id:created.data.room_session_id,room_code:created.data.room_code,player_token:token,access_token:created.data.access_token};
  saveSession(s);assert.deepEqual(readSession(),s);
  const syncBody={action:'sync',revision:created.data.snapshot.revision,request_id:randomUUID(),...readSession()};
  const synced=await call(syncBody);assert.equal(synced.status,200);assert.equal(synced.data.snapshot.room_session_id,s.room_session_id);
  const failed=await call({...syncBody,room_session_id:'f'.repeat(64)});assert.equal(failed.status,400);assert.equal(failed.data.error,'Room unavailable');
  assert.ok(logs.some(([label,data])=>label==='CampusStack campus_enter result' && data.campus_enter_succeeded && data.room_session_prefix===s.room_session_id.slice(0,8)));
  assert.ok(logs.some(([label,data])=>label==='CampusStack game-api request' && data.action==='sync' && data.room_session_prefix===s.room_session_id.slice(0,8)));
  assert.ok(logs.some(([label,data])=>label==='CampusStack game-api error' && data.action==='sync' && data.rpc==='campus_action' && data.code==='P0001'));
  const output=JSON.stringify(logs);for(const sensitive of [token,signingSecret,s.access_token,s.room_session_id])assert.equal(output.includes(sensitive),false);
 }finally{console.info=info;console.error=error;if(previousStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=previousStorage;}
});
test('expanded entry and action payloads reach transactional RPCs through the same signed API',async()=>{
 const token=randomBytes(32).toString('hex');const created=await call({action:'create',name:'Expanded',player_token:token,rules_version:2});assert.equal(created.status,200);assert.equal(created.data.snapshot.rules_version,2);
 const body={player_token:token,player_id:created.data.player_id,room_session_id:created.data.room_session_id,request_id:randomUUID(),revision:created.data.snapshot.revision,action:'character',payload:{character:'mascot'}};
 const changed=await call(body);assert.equal(changed.status,200);assert.equal(changed.data.snapshot.players[0].character,'mascot');
 const invalid=await call({...body,request_id:randomUUID(),payload:null});assert.equal(invalid.status,400);assert.equal(invalid.data.error,'Invalid action payload');
 const {payload}=await jwtVerify(changed.data.access_token,new TextEncoder().encode(signingSecret));assert.equal(payload.room_session_id,created.data.room_session_id);assert.equal(JSON.stringify(changed.data).includes(token),false);
});
