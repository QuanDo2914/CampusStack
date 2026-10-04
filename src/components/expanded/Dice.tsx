import { useEffect, useState } from "react";
export function Dice({ values, busy }: { values?: number[]; busy: boolean }) {
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (!values) return;
    setRolling(true);
    const t = setTimeout(() => setRolling(false), 550);
    return () => clearTimeout(t);
  }, [values?.join(",")]);
  return (
    <div
      className={`campus-dice ${rolling || busy ? "rolling" : ""}`}
      aria-label={
        values ? `Dice ${values.join(" and ")}` : "Two six-sided dice"
      }
    >
      {[0, 1].map((i) => (
        <span key={i}>{String.fromCodePoint(0x267f + (values?.[i] || 1))}</span>
      ))}
      {values && <strong>= {values[0] + values[1]}</strong>}
    </div>
  );
}
