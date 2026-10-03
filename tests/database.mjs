import {PGlite} from '@electric-sql/pglite';import pg from 'pg';import {readFile,readdir} from 'node:fs/promises';
function pglitePool(db){
 let tail=Promise.resolve();
 async function connect(){let release;const gate=new Promise(r=>release=r);const wait=tail;tail=tail.then(()=>gate);await wait;
  return {query:async(sql,params)=>{if(params)return db.query(sql,params);const results=await db.exec(sql);return results.at(-1)||{rows:[],rowCount:0};},release};}
 return {connect,query:async(sql,params)=>{const c=await connect();try{return await c.query(sql,params);}finally{c.release();}},end:()=>db.close()};
}
export async function database(){
 // TEST_DATABASE_URL must point at an EMPTY disposable database. Never a production database.
 const pool=process.env.TEST_DATABASE_URL ? new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,max:12}) : pglitePool(new PGlite());
 if(process.env.TEST_DATABASE_URL){
  const check=await pool.query("select count(*)::integer as n from information_schema.tables where table_schema not in ('pg_catalog','information_schema') and table_type='BASE TABLE'");
  if(check.rows[0].n!==0){await pool.end();throw new Error('TEST_DATABASE_URL must point at an empty disposable database');}
 }
 await pool.query(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 grant usage on schema public,auth to anon,authenticated; grant execute on function auth.jwt() to anon,authenticated;
 create publication supabase_realtime;`);
 const directory=new URL('../supabase/migrations/',import.meta.url);
 for(const file of (await readdir(directory)).filter(x=>x.endsWith('.sql')).sort())await pool.query(await readFile(new URL(file,directory),'utf8'));
 const rpc=async(name,args)=>{
  const params=Object.values(args);const placeholders=params.map((_,i)=>`$${i+1}`).join(',');
  if(!['campus_enter','campus_action','campus_rate_limit'].includes(name))throw new Error('Unknown RPC');
  const c=await pool.connect();try{await c.query('begin');await c.query('set local role service_role');const r=await c.query(`select public.${name}(${placeholders}) as result`,params);await c.query('commit');return r.rows[0].result;}
  catch(e){await c.query('rollback');throw e;}finally{c.release();}
 };
 return {pool,rpc,stop:()=>pool.end()};
}
