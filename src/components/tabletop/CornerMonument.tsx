// Original campus corner toys, sharing the same roof projection as the slab.
export function CornerMonument({ index }: { index: number }) {
  const airport = index === 10, security = index === 20, visiting = index === 30;
  const color = airport ? '#719ca2' : security ? '#c78f76' : visiting ? '#bda468' : '#498268';
  return <svg className={`corner-monument monument-${index}`} viewBox="0 0 80 88" aria-hidden="true">
    <ellipse cx="40" cy="78" rx="35" ry="9" fill="#3c5c40" opacity=".16"/>
    <path d="m5 64 34-17 36 18-35 18Z" fill="#e6dfc4"/><path d="m5 64 35 19v5L5 69Z" fill="#a9b79b"/><path d="m40 83 35-18v5L40 88Z" fill="#7d997f"/>
    <path d="m14 30 25 12v32L14 62Z" fill="#fff2d5"/><path d="m39 42 25-12v32L39 74Z" fill="#d2dec9"/>
    <path d="m9 30 29-15 31 15-30 15Z" fill={color}/><path d="m9 30 30 15v5L9 35Z" fill={color} style={{filter:'brightness(.8)'}}/><path d="m39 45 30-15v5L39 50Z" fill={color} style={{filter:'brightness(.65)'}}/>
    <path d="m20 45 9 4v13l-9-4Zm28 6 10-5v14l-10 5Z" fill="#88b5b8" stroke="#fff5dd" strokeWidth="2"/>
    {airport ? <><path d="M38 0v20" stroke="#6d8979" strokeWidth="2"/><path d="m39 2 18 5-18 6Z" fill="#e8b75c"/><path d="m32 26 6-3 7 3-7 3Z" fill="#edf9e9"/></> : visiting ? <path d="m22 60 15 7m-12-8v10m6-7v10m6-7v10" stroke="#607d69" strokeWidth="3"/> : security ? <path d="m29 51 6 3v8l-6 3-6-8v-8Z" fill="#6e8e75"/> : <><path d="m26 50 7 3v17l-7-3Z" fill="#456e57"/><path d="m13 30 25-13 26 13" fill="none" stroke="#dcebc9" strokeWidth="2"/></>}
  </svg>;
}
