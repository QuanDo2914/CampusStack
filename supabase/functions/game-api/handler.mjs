import { SignJWT, importJWK } from 'jose';
const actions = new Set(['create','join','sync','start','roll','buy','skip','advance-turn','finish-game']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const session = /^[0-9a-f]{64}$/;
const secret = /^[0-9a-f]{64}$/;
export function makeHandler({rpc, env}) {
 let signingKey;
 async function sign(data) {
  const jwk = env('CAMPUS_JWT_JWK');
  const raw = env('CAMPUS_JWT_SECRET');
  if (!jwk && !raw) throw new Error('Server signing key is not configured');
  const parsed = jwk ? JSON.parse(jwk) : null;
  // Import the configured private JWK for signing only; Web Crypto rejects combined usages.
  signingKey ??= parsed ? importJWK({...parsed,key_ops:['sign']}, parsed.alg || 'ES256') : Promise.resolve(new TextEncoder().encode(raw));
  return new SignJWT({role:'anon',room_session_id:data.room_session_id})
   .setProtectedHeader({alg:parsed ? (parsed.alg || 'ES256') : 'HS256',typ:'JWT', ...(parsed?.kid ? {kid:parsed.kid} : {})})
   .setSubject(data.player_id).setIssuedAt().setExpirationTime('1h').sign(await signingKey);
 }
 return async function handle(request) {
  const origin=request.headers.get('origin');
  const allowed=(env('ALLOWED_ORIGINS') || 'http://localhost:5173').split(',').map(x=>x.trim());
  const cors={'Access-Control-Allow-Origin': origin && allowed.includes(origin) ? origin : allowed[0],
   'Access-Control-Allow-Headers':'content-type,authorization,apikey,x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
  const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
  if(origin && !allowed.includes(origin)) return reply({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST') return reply({error:'Use POST'},405);
  try {
   const text=await request.text();
   if(text.length>4096) return reply({error:'Request too large'},413);
   const b=JSON.parse(text);
   if(!env('CAMPUS_JWT_SECRET') && !env('CAMPUS_JWT_JWK'))throw new Error('Server signing key is not configured');
   if(!actions.has(b.action)) return reply({error:'Unknown action'},400);
   if(!secret.test(b.player_token || '')) return reply({error:'Invalid player session'},401);
   let data;
   if(env('CAMPUS_LOCAL_TEST')!=='1'){
    const entry=b.action==='create' || b.action==='join';
    // Hosted gateway supplies forwarded address. No raw addresses are retained.
    const identity=entry ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown') : b.player_token;
    const salt=env('CAMPUS_JWT_SECRET') || env('CAMPUS_JWT_JWK') || '';
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+identity)))].map(x=>x.toString(16).padStart(2,'0')).join('');
    if(!await rpc('campus_rate_limit',{p_key:(entry ? 'entry:' : 'action:')+hash,p_limit:entry ? 15 : 120}))return reply({error:'Too many requests. Please wait a minute and retry.'},429);
   }
   if(b.action==='create' || b.action==='join') {
    if(typeof b.name!=='string' || b.name.trim().length<1 || b.name.trim().length>24 || /[\x00-\x1f\x7f]/.test(b.name)) return reply({error:'Use a name with 1–24 printable characters'},400);
    if(b.action==='join' && !/^[A-Z2-9]{6}$/.test(String(b.code).trim().toUpperCase())) return reply({error:'Enter a six-character room code'},400);
    // A stable client-generated entry secret makes create/join retries recoverable.
    const letters='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for(let attempt=0;attempt<5;attempt++) {
     const bytes=crypto.getRandomValues(new Uint8Array(6));
     const code=b.action==='create' ? [...bytes].map(v=>letters[v % letters.length]).join('') : b.code.trim().toUpperCase();
     try { data=await rpc('campus_enter',{p_action:b.action,p_code:code,p_name:b.name.trim(),p_token:b.player_token}); break; }
     catch(e) { if(b.action==='create' && e.code==='23505' && attempt<4) continue; throw e; }
    }
   } else {
    if(!uuid.test(b.player_id || '') || !session.test(b.room_session_id || '') || !uuid.test(b.request_id || '') || !Number.isInteger(b.revision) || b.revision<0) return reply({error:'Invalid action request'},400);
    data=await rpc('campus_action',{p_session:b.room_session_id,p_player:b.player_id,p_token:b.player_token,p_action:b.action,p_request:b.request_id,p_revision:b.revision});
    data.player_id=b.player_id; data.room_session_id=b.room_session_id;
   }
   data.access_token=await sign(data);
   return reply(data);
  } catch(e) {
   // Temporary diagnostics: allowlisted fields only; never log the error object or request.
   const redactions=['CAMPUS_JWT_SECRET','CAMPUS_JWT_JWK','CAMPUS_SERVER_KEY','SUPABASE_SERVICE_ROLE_KEY']
    .map(name=>env(name)).filter(value=>typeof value==='string' && value.length>0);
   try { const key=JSON.parse(env('CAMPUS_JWT_JWK') || '{}');
    for(const value of [key.d,key.k]) if(typeof value==='string' && value.length>0) redactions.push(value);
   } catch { /* Invalid signing-key JSON must not be echoed into logs. */ }
   const diagnostic=value=>{
    if(typeof value!=='string') return undefined;
    for(const secret of redactions) value=value.split(secret).join('[REDACTED]');
    return value.replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[REDACTED]')
     .replace(/\bsb_secret_[A-Za-z0-9_-]+\b/g,'[REDACTED]')
     .replace(/\b[a-f0-9]{64,}\b/gi,'[REDACTED]')
     .replace(/\b(?:Bearer|Basic)\s+\S+/gi,'[REDACTED]').slice(0,2000);
   };
   console.error('CampusStack game-api error',{
    message:e instanceof SyntaxError ? 'Invalid JSON input (contents omitted)' : diagnostic(e?.message),
    code:diagnostic(e?.code),
    details:diagnostic(e?.details),
    hint:diagnostic(e?.hint)
   });
   // SQL P0001 exceptions are user-facing validation failures. Never echo infrastructure errors.
   const safe=e.code==='P0001' || e instanceof SyntaxError;
   return reply({error:safe ? (e instanceof SyntaxError ? 'Invalid JSON request' : e.message) : 'Unable to reach the game server. Please retry.'},safe ? 400 : 503);
  }
 };
}
