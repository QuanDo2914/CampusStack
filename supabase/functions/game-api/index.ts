import { createClient } from 'npm:@supabase/supabase-js@2';
import { makeHandler } from './handler.mjs';
const client = createClient(Deno.env.get('SUPABASE_URL')!, (Deno.env.get('CAMPUS_SERVER_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!, {auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(makeHandler({
 env:(name:string)=>Deno.env.get(name),
 rpc:async(name:string,args:Record<string,unknown>)=>{
  const {data,error}=await client.rpc(name,args);
  if(error) throw error;
  return data;
 }
}));
