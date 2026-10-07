// Approval-study artwork only. Property identity and level are independent of
// the permanent district accent and the separate owner flag on the tile.
export const foodStudyProfiles = {
  "Eng. Café": { form: "cafe", height: 25 },
  "Green Street": { form: "pizzeria", height: 22 },
  "Library Café": { form: "library", height: 33 },
} as const;
type P = [number, number];
const project = ([u, v]: P, h = 0): P => [50 + u - v, 85 + (u + v) * 0.5 - h];
const path = (p: P[]) => p.map((v) => v.join(",")).join(" ");
function Building({
  u,
  v,
  size,
  height,
  form,
  color,
}: {
  u: number;
  v: number;
  size: number;
  height: number;
  form: string;
  color: string;
}) {
  const footprint: P[] = [
    [u - size, v - size],
    [u + size, v - size],
    [u + size, v + size],
    [u - size, v + size],
  ];
  const floor = footprint.map((p) => project(p)),
    roof = footprint.map((p) => project(p, height));
  const [cx, cy] = project([u, v], height);
  return (
    <g data-property-form={form}>
      <polygon
        points={path([roof[3], roof[2], floor[2], floor[3]])}
        fill="#f4e1b8"
        stroke="#a39b7b"
        strokeWidth=".7"
      />
      <polygon
        points={path([roof[2], roof[1], floor[1], floor[2]])}
        fill="#a6bba7"
        stroke="#718b78"
        strokeWidth=".7"
      />
      <polygon
        points={path(roof)}
        fill={color}
        stroke="#785130"
        strokeWidth=".8"
      />
      <path
        d={`M${roof[3]}L${roof[2]}L${roof[1]}`}
        stroke="#804721"
        strokeWidth="2"
        fill="none"
      />
      {form === "pizzeria" ? (
        <>
          <path
            d={`M${roof[3]}L${cx},${cy - 10}L${roof[1]}L${roof[2]}Z`}
            fill={color}
            stroke="#804721"
            strokeWidth="1"
          />
          <path d={`M${roof[2]}L${cx},${cy - 10}L${roof[1]}Z`} fill="#a54b24" />
          <path
            d={`m${cx + 9} ${cy - 7}v-9l5 2v10Z`}
            fill="#ede2be"
            stroke="#8a8b70"
          />
          <path
            d={`M${floor[3][0] + 5},${floor[3][1] - 5}v-9q6-9 12 4v11Z`}
            fill="#593d2e"
            stroke="#d1a276"
            strokeWidth="2"
          />
          <path
            d={`m${cx - 5} ${cy + 17} 10 5v7l-10-5Z`}
            fill="#fff0cc"
            stroke="#8a6240"
          />
          <path d={`m${cx - 2} ${cy + 19} 6 3-3 3Z`} fill={color} />
        </>
      ) : form === "library" ? (
        <>
          <path
            d={`m${cx - 7} ${cy} 9-5 10 5-9 5Z`}
            fill="#d9e6ca"
            stroke="#6e8e7b"
          />
          <path d={`m${cx - 7} ${cy} 9-5v5l-9 5Z`} fill="#77a4a3" />
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`m${floor[3][0] + 6 + i * 6} ${floor[3][1] - height * 0.5 + i * 3}v-10l4 2v10Z`}
              fill="#537c7b"
              stroke="#e9d8ae"
              strokeWidth=".7"
            />
          ))}
          <path
            d={`m${cx + 4} ${cy + height - 14} 11-5v10l-11 5Z`}
            fill="#3f6b66"
          />
          <path
            d={`m${cx + 5} ${cy + height - 13} 3 1 3-3 3-1v6l-3 1-3 3-3-1Z`}
            fill="#f9edc6"
          />
        </>
      ) : (
        <>
          <path
            d={`m${cx - 21} ${cy + 15} 22 11 5-7-22-11Z`}
            fill={color}
            stroke="#85572d"
          />
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`m${cx - 18 + i * 6} ${cy + 11 + i * 3} 2 8`}
              stroke="#fff2d0"
              strokeWidth="3"
            />
          ))}
          <path
            d={`m${cx - 8} ${cy - 6} 8 4v8l-8-4Z`}
            fill="#fff5d7"
            stroke="#796f52"
          />
          <path
            d={`m${cx} ${cy - 2}q6 1 4 5l-4-1`}
            fill="none"
            stroke="#fff2d0"
            strokeWidth="2"
          />
          <path
            d={`m${cx + 7} ${cy + height - 17} 8-4v12l-8 4Z`}
            fill="#4d7d79"
            stroke="#eee4bd"
          />
        </>
      )}
    </g>
  );
}
export function FoodStudyMiniature({
  name,
  level,
  color,
}: {
  name: string;
  level: number;
  color: string;
}) {
  if (level === 0) return null;
  const profile =
    foodStudyProfiles[name as keyof typeof foodStudyProfiles] ||
    foodStudyProfiles["Eng. Café"];
  const placements =
    level === 1
      ? [{ u: 0, v: 0, size: 16 }]
      : level === 2
        ? [
            { u: -11, v: 4, size: 10 },
            { u: 12, v: -3, size: 10 },
          ]
        : level === 3
          ? [
              { u: 0, v: -13, size: 9 },
              { u: -13, v: 10, size: 9 },
              { u: 12, v: 10, size: 9 },
            ]
          : [{ u: 0, v: 0, size: level === 5 ? 19 : 17 }];
  const height =
    level < 4 ? profile.height - (level > 1 ? 5 : 0) : level === 4 ? 47 : 61;
  return (
    <svg
      viewBox="0 0 100 110"
      aria-hidden="true"
      data-food-property={profile.form}
      data-development-level={level}
    >
      <ellipse cx="54" cy="96" rx="36" ry="9" fill="#28442b" opacity=".2" />
      <path d="m10 86 40-20 40 20-40 20Z" fill="#e2d8ba" />
      <path d="m10 86 40 20v4L10 90Z" fill="#adad8e" />
      <path d="m50 106 40-20v4l-40 20Z" fill="#788c73" />
      {placements.map((p, i) => (
        <Building
          key={i}
          {...p}
          height={height}
          color={color}
          form={profile.form}
        />
      ))}
      {level >= 4 && (
        <g stroke="#4c7c76" strokeWidth="3">
          {[0, 1, 2].map((i) => (
            <path key={i} d={`m40 ${55 + i * 9} 6 3m12-1 6-3`} />
          ))}
        </g>
      )}
      {level === 5 && (
        <>
          <path d="M51 20V4" stroke="#526d49" strokeWidth="2" />
          <path d="m52 5 13 4-13 5Z" fill={color} />
          <Building
            u={-21}
            v={11}
            size={8}
            height={17}
            color={color}
            form="cafe"
          />
        </>
      )}
    </svg>
  );
}
