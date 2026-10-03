import {test,before,after} from 'node:test';import assert from 'node:assert/strict';import {randomBytes,randomUUID} from 'node:crypto';import {jwtVerify,generateKeyPair,exportJWK,decodeProtectedHeader} from 'jose';import {database} from './database.mjs';import {makeHandler} from '../supabase/functions/game-api/handler.mjs';
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
 const {privateKey,publicKey}=await generateKeyPair('ES256',{extractable:true});const jwk={...await exportJWK(privateKey),kid:randomUUID()};
 const handler=makeHandler({rpc:db.rpc,env:name=>name==='CAMPUS_JWT_JWK' ? JSON.stringify(jwk) : undefined});
 const response=await handler(new Request('http://local/action',{method:'POST',headers:{origin:'http://localhost:5173','x-forwarded-for':randomUUID()},body:JSON.stringify({action:'create',name:'ES256',player_token:randomBytes(32).toString('hex')})}));assert.equal(response.status,200);
 const data=await response.json();assert.equal(decodeProtectedHeader(data.access_token).kid,jwk.kid);const {payload}=await jwtVerify(data.access_token,publicKey);assert.equal(payload.room_session_id,data.room_session_id);assert.equal(payload.role,'anon');
});
