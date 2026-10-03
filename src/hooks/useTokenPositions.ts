import {useEffect,useRef,useState} from 'react';import type {Player} from '../types/game';
export function useTokenPositions(players:Player[]){
 const [positions,setPositions]=useState<Record<string,number>>(()=>Object.fromEntries(players.map(p=>[p.id,p.position])));const current=useRef(positions);
 useEffect(()=>{
  const timers:ReturnType<typeof setTimeout>[]=[];
  for(const p of players){const start=current.current[p.id] ?? p.position;const steps=(p.position-start+20)%20;
   if(steps===0)continue;
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const count=reduced ? 1 : steps;
   for(let i=1;i<=count;i++)timers.push(setTimeout(()=>{const position=reduced ? p.position : (start+i)%20;current.current={...current.current,[p.id]:position};setPositions(current.current);},reduced ? 0 : i*90));
  }
  return()=>timers.forEach(clearTimeout);
 },[players.map(p=>`${p.id}:${p.position}`).join('|')]);
 return positions;
}
