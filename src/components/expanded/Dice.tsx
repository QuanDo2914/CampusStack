import { useEffect, useState } from "react";
const pips: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
export function Dice({
  values,
  rollKey,
}: {
  values?: number[];
  busy: boolean;
  rollKey?: number;
}) {
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (!values) return;
    setRolling(true);
    const t = setTimeout(() => setRolling(false), 800);
    return () => clearTimeout(t);
  }, [values?.join(","), rollKey]);
  return (
    <div
      className={`campus-dice physical-dice ${rolling ? "rolling" : ""} ${values && values[0] === values[1] ? "is-doubles" : ""}`}
      aria-label={
        values ? `Dice ${values.join(" and ")}` : "Two six-sided dice"
      }
    >
      {[0, 1].map((i) => (
        <span key={i} className="pip-die">
          {Array.from({ length: 9 }, (_, n) => (
            <i
              key={n}
              className={
                pips[values?.[i] || 1].includes(n) ? "pip" : "pip empty"
              }
            />
          ))}
        </span>
      ))}
      {values && (
        <strong className="dice-total">
          {values[0] + values[1]}
          <small>{values[0] === values[1] ? "DOUBLES" : "TOTAL"}</small>
        </strong>
      )}
    </div>
  );
}
