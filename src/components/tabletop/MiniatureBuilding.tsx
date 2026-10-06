// Original toy-campus miniatures: projected roof, two shaded walls, raised plinth.
export function MiniatureBuilding({ level, color }: { level: number; color: string }) {
  const landmark = level === 5, roof = landmark ? '#c7a355' : color;
  const top = landmark ? 13 : level >= 3 ? 20 : 28;
  return <svg className={`campus-miniature miniature-level-${level}`} viewBox="0 0 64 76" aria-hidden="true" style={{'--roof': roof} as React.CSSProperties}>
    <ellipse cx="33" cy="67" rx="26" ry="7" fill="#243f35" opacity=".18" />
    <path d="m6 57 25-12 27 13-25 13Z" fill="#e1dabc" />
    <path d="m6 57 27 14v5L6 62Z" fill="#a8b09a" /><path d="m33 71 25-13v5L33 76Z" fill="#768e75" />
    <path d={`M13 ${top+12}L33 ${top+22}L33 62L13 52Z`} fill="#fff6da" />
    <path d={`M33 ${top+22}L53 ${top+12}L53 52L33 62Z`} fill="#cfdec9" />
    <path d={`m10 ${top+12} 21-12 25 12-23 12Z`} fill="var(--roof)" />
    <path d={`m10 ${top+12} 23 12v5L10 ${top+17}Z`} fill="var(--roof)" style={{filter:'brightness(.8)'}} />
    <path d={`m33 ${top+24} 23-12v5l-23 12Z`} fill="var(--roof)" style={{filter:'brightness(.65)'}} />
    <path d={`m17 ${top+23} 5 2v7l-5-2Zm9 4 4 2v7l-4-2Zm12 1 5-2v7l-5 2Zm9-4 4-2v7l-4 2Z`} fill="#7daeb5" stroke="#f6f8e5" strokeWidth="1" />
    {level >= 3 && <path d="m17 43 5 2v7l-5-2Zm9 4 4 2v7l-4-2Zm12 1 5-2v7l-5 2Zm9-4 4-2v7l-4 2Z" fill="#7daeb5" stroke="#f6f8e5" strokeWidth="1" />}
    <path d="m28 54 5 2v7l-5-2Z" fill="#587760" />
    {level === 2 || level === 4 ? <><path d="m4 44 11-6 13 6v15l-12 6-12-6Z" fill="#f7ebcc"/><path d="m2 44 13-7 15 7-14 7Z" fill="var(--roof)"/><path d="m8 50 5 2v5l-5-2Z" fill="#79a6b1"/></> : null}
    {landmark && <><path d="M32 4v12" stroke="#5b7258" strokeWidth="2"/><path d="m33 4 13 3-13 5Z" fill="#dcad50"/><path d="m28 18 5-3 5 3-5 3Z" fill="#fff1bf"/></>}
  </svg>;
}
