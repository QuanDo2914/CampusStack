import { useId } from "react";

// A square rotated 45° and projected at 60° to the camera (2:1 diamond).
export function DiamondScenery() {
  const id = useId();
  return <svg className="diamond-scenery" viewBox="0 0 1000 500" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-quad-grass`} x2=".8" y2="1"><stop stopColor="#cfdeae"/><stop offset="1" stopColor="#a7c796"/></linearGradient>
      <linearGradient id={`${id}-slab-left`} y2="1"><stop stopColor="#b8c3a7"/><stop offset="1" stopColor="#899b7f"/></linearGradient>
      <linearGradient id={`${id}-slab-right`} y2="1"><stop stopColor="#8ea184"/><stop offset="1" stopColor="#637c63"/></linearGradient>
      <pattern id={`${id}-quad-lines`} width="42" height="21" patternUnits="userSpaceOnUse" patternTransform="rotate(26.565)"><path d="M0 0v21" stroke="#fff" opacity=".055" strokeWidth="20"/></pattern>
      <filter id={`${id}-ground-shadow`} x="-.2" y="-.5" width="1.4" height="2"><feGaussianBlur stdDeviation="12"/></filter>
    </defs>
    <path d="m30 273 470-235 470 235-470 235Z" fill="#234432" opacity=".2" filter={`url(#${id}-ground-shadow)`} transform="translate(0 24)"/>
    <path d="m0 250 500 250v29L0 279Z" fill={`url(#${id}-slab-left)`}/>
    <path d="m500 500 500-250v29L500 529Z" fill={`url(#${id}-slab-right)`}/>
    <path d="m0 271 500 250 500-250v8L500 529 0 279Z" fill="#58705d"/>
    <path d="M500 0 1000 250 500 500 0 250Z" fill="#e7ead6" stroke="#aab89b" strokeWidth="3"/>
    <path d="m500 95 310 155-310 155L190 250Z" fill={`url(#${id}-quad-grass)`} stroke="#e4e6cd" strokeWidth="6"/>
    <path d="m500 98 304 152-304 152L196 250Z" fill={`url(#${id}-quad-lines)`}/>
    <path d="m296 150 408 200M704 150 296 350" stroke="#e9e1bb" strokeWidth="14"/>
    <path d="m296 150 408 200M704 150 296 350" stroke="#f0e8c9" strokeWidth="10"/>
    <g transform="translate(295 246)"><ellipse cy="14" rx="38" ry="18" fill="#4a7358" opacity=".18"/><ellipse cy="8" rx="34" ry="17" fill="#a8bba2"/><ellipse rx="34" ry="17" fill="#e5e7cf"/><ellipse rx="25" ry="12" fill="#7ab7bb"/><ellipse cy="-2" rx="19" ry="8" fill="#a6d0cf"/><path d="M0-17v18" stroke="#f6f8e6" strokeWidth="5"/><ellipse cy="-17" rx="8" ry="4" fill="#f5f4da"/></g>
    {[ [435,205],[670,260],[425,305],[610,310] ].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}><ellipse cy="15" rx="22" ry="10" fill="#426748" opacity=".2"/><path d="m-4 0 8 2v15l-8-2Z" fill="#a39165"/><path d="m0-43 23 36Q18 10 0 13Q-19 7-23-7Z" fill="#638e59"/><path d="M0-43 16-7Q13 4 0 7Z" fill="#90b571"/></g>)}
    <g fill="#7fa169" stroke="#94b87e" strokeWidth="2"><ellipse cx="247" cy="270" rx="12" ry="6"/><ellipse cx="735" cy="242" rx="13" ry="6"/><ellipse cx="615" cy="375" rx="11" ry="5"/></g>
    <text x="500" y="355" textAnchor="middle" fill="#64835d" fontSize="12" letterSpacing="5">THE CAMPUS QUAD</text>
  </svg>;
}
