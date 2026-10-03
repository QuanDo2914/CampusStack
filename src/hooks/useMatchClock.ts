import {useEffect,useRef,useState} from 'react';import type {Action,Snapshot} from '../types/game';
export function useMatchClock(snapshot:Snapshot|null,offset:number,act:(a:Action)=>Promise<void>,busy:boolean){
 const [now,setNow]=useState(Date.now());const last=useRef({key:'',time:0});
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(timer);},[]);
 const serverNow=now+offset;
 const matchSeconds=snapshot?.match_ends_at ? Math.max(0,Math.ceil((Date.parse(snapshot.match_ends_at)-serverNow)/1000)) : 900;
 const turnSeconds=snapshot?.turn_ends_at ? Math.max(0,Math.ceil((Date.parse(snapshot.turn_ends_at)-serverNow)/1000)) : 30;
 useEffect(()=>{
  if(!snapshot || snapshot.status!=='active' || busy)return;
  const action:Action|null=matchSeconds===0 ? 'finish-game' : turnSeconds===0 ? 'advance-turn' : null;
  if(!action)return;
  const key=`${snapshot.room_session_id}:${action}:${snapshot.turn_ends_at}`;
  if(last.current.key===key && Date.now()-last.current.time<3000)return;
  last.current={key,time:Date.now()};void act(action);
 },[snapshot,matchSeconds,turnSeconds,busy,act]);
 return {matchSeconds,turnSeconds};
}
export function timeLabel(seconds:number){return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;}
