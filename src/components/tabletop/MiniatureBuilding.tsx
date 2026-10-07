import type { CSSProperties } from "react";

// Rendering metadata only. Economics and development limits stay in game state.
export const architecture: Record<
  string,
  { name: string; landmark: string; roof: string }
> = {
  food: { name: "Storefront", landmark: "Campus Food Hall", roof: "awning" },
  wellness: {
    name: "Recreation pavilion",
    landmark: "Athletic Complex",
    roof: "court",
  },
  arts: { name: "Studio", landmark: "Performing Arts Center", roof: "fold" },
  housing: { name: "Residence", landmark: "Residence Tower", roof: "terrace" },
  science: { name: "Science lab", landmark: "Research Complex", roof: "dome" },
  innovation: { name: "Tech lab", landmark: "Innovation Tower", roof: "glass" },
  social: {
    name: "Campus commons",
    landmark: "Student Union Hall",
    roof: "hall",
  },
  green: {
    name: "Garden pavilion",
    landmark: "Sustainability Center",
    roof: "solar",
  },
};
type Point = [number, number];
const project = ([u, v]: Point, height = 0): Point => [
  50 + u - v,
  87 + (u + v) * 0.5 - height,
];
const points = (p: Point[]) => p.map((q) => q.join(",")).join(" ");
function Structure({
  u,
  v,
  size,
  height,
  color,
  roof,
  major = false,
}: {
  u: number;
  v: number;
  size: number;
  height: number;
  color: string;
  roof: string;
  major?: boolean;
}) {
  const corners: Point[] = [
    [u - size, v - size],
    [u + size, v - size],
    [u + size, v + size],
    [u - size, v + size],
  ];
  const floor = corners.map((p) => project(p)),
    top = corners.map((p) => project(p, height));
  const center = project([u, v], height);
  return (
    <g className="mini-structure" data-height={height}>
      <polygon
        points={points([top[3], top[2], floor[2], floor[3]])}
        fill="#f4e7c5"
        stroke="#b3ae96"
        strokeWidth=".7"
      />
      <polygon
        points={points([top[2], top[1], floor[1], floor[2]])}
        fill={roof === "glass" ? "#79b4bd" : "#bcccb9"}
        stroke="#879d91"
        strokeWidth=".7"
      />
      <polygon
        points={points(top)}
        fill={color}
        stroke="#365d4b"
        strokeWidth=".7"
      />
      <path
        d={`M${top[3]}L${top[2]}L${top[1]}`}
        fill="none"
        stroke="#294f42"
        strokeWidth="2"
        opacity=".45"
      />
      {Array.from({ length: major ? 3 : 1 }, (_, row) => (
        <g key={row} transform={`translate(0 ${row * 9})`}>
          <path
            d={`M${top[3][0] + 4} ${top[3][1] + 5}l5 2.5v5l-5-2.5Zm9 4.5 5 2.5v5l-5-2.5Z`}
            fill="#73a9b2"
            stroke="#fffbdf"
            strokeWidth=".8"
          />
          <path
            d={`M${top[1][0] - 4} ${top[1][1] + 5}l-5 2.5v5l5-2.5Zm-9 4.5-5 2.5v5l5-2.5Z`}
            fill="#426f80"
            stroke="#d4e7e2"
            strokeWidth=".8"
          />
        </g>
      ))}
      <path
        d={`M${floor[3][0] + size * 0.75} ${floor[3][1] + size * 0.375 - 9}l6 3v9l-6-3Z`}
        fill="#315c4b"
      />
      {roof === "awning" && (
        <path
          d={`M${floor[3][0] - 1} ${floor[3][1] - 13}l${size * 2 + 2} ${size + 1}`}
          stroke={color}
          strokeWidth="6"
        />
      )}
      {roof === "glass" && (
        <polygon
          points={points(
            top.map(([x, y]) => [
              center[0] + (x - center[0]) * 0.6,
              center[1] + (y - center[1]) * 0.6 - 3,
            ]),
          )}
          fill="#b1dfe4"
          stroke="#e7f5ea"
          strokeWidth="1"
        />
      )}
      {roof === "solar" && (
        <path
          d={`M${center[0] - size * 0.7} ${center[1]}l${size * 0.9} ${size * 0.45} ${size * 0.8} -${size * 0.4}`}
          fill="none"
          stroke="#284b67"
          strokeWidth="5"
        />
      )}
      {roof === "dome" && (
        <>
          <ellipse
            cx={center[0]}
            cy={center[1] - 1}
            rx={size * 0.6}
            ry={size * 0.3}
            fill="#486f91"
          />
          <path
            d={`M${center[0] - size * 0.6} ${center[1] - 1}q0-${size * 1.1} ${size * 0.6}-${size * 1.1}q${size * 0.6} 0 ${size * 0.6} ${size * 1.1}`}
            fill="#b5d9de"
            stroke="#59859a"
            strokeWidth=".8"
          />
        </>
      )}
      {roof === "fold" && (
        <path
          d={`M${top[3]}L${center[0]} ${center[1] - 9}L${top[1]}`}
          fill="none"
          stroke="#f2b7cc"
          strokeWidth="5"
        />
      )}
      {roof === "court" && (
        <polygon
          points={points(
            top.map(([x, y]) => [
              center[0] + (x - center[0]) * 0.65,
              center[1] + (y - center[1]) * 0.65,
            ]),
          )}
          fill="none"
          stroke="#e7efbd"
          strokeWidth="1.5"
        />
      )}
      {roof === "hall" && (
        <path
          d={`M${center[0] - 8} ${center[1] + 3}l8-11 8 11`}
          fill="#ffe2be"
          stroke="#ce9b6f"
          strokeWidth="1"
        />
      )}
      {roof === "terrace" && (
        <polygon
          points={points(
            top.map(([x, y]) => [
              center[0] + (x - center[0]) * 0.8,
              center[1] + (y - center[1]) * 0.8,
            ]),
          )}
          fill="none"
          stroke="#f6eac3"
          strokeWidth="2"
        />
      )}
    </g>
  );
}
export function MiniatureBuilding({
  level,
  color,
  district = "innovation",
  ownerColor,
}: {
  level: number;
  color: string;
  district?: string;
  ownerColor?: string;
}) {
  if (level <= 0) return null;
  const profile = architecture[district] || architecture.innovation;
  const major = level >= 4,
    landmark = level === 5;
  const landmarkHeight =
    (
      {
        food: 30,
        wellness: 24,
        arts: 34,
        housing: 58,
        science: 46,
        innovation: 58,
        social: 37,
        green: 38,
      } as Record<string, number>
    )[district] || 58;
  const placements: { u: number; v: number; size: number; height: number }[] =
    major
      ? [{ u: 0, v: 0, size: 17, height: landmark ? landmarkHeight : 43 }]
      : level === 1
        ? [{ u: 0, v: 0, size: 15, height: 23 }]
        : level === 2
          ? [
              { u: -12, v: 0, size: 10, height: 22 },
              { u: 12, v: 0, size: 10, height: 22 },
            ]
          : [
              { u: -12, v: -12, size: 9, height: 24 },
              { u: -12, v: 12, size: 9, height: 21 },
              { u: 12, v: 0, size: 10, height: 25 },
            ];
  return (
    <svg
      className={`campus-miniature miniature-level-${level} architecture-${district}`}
      viewBox="0 0 100 110"
      aria-hidden="true"
      style={{ "--roof": color } as CSSProperties}
    >
      <title>{`${landmark ? profile.landmark : profile.name} · level ${level}`}</title>
      <ellipse
        className="mini-contact-shadow"
        cx="54"
        cy="95"
        rx="34"
        ry="10"
        fill="#173e31"
        opacity=".22"
      />
      <path d="m12 87 38-19 38 19-38 19Z" fill="#e0ddc7" />
      <path d="m12 87 38 19v4L12 91Z" fill="#afbaa2" />
      <path d="m50 106 38-19v4l-38 19Z" fill="#7e957d" />
      {placements.map((p, i) => (
        <Structure
          key={i}
          {...p}
          color={color}
          roof={profile.roof}
          major={major}
        />
      ))}
      {landmark && (
        <>
          <Structure
            u={-20}
            v={5}
            size={9}
            height={15}
            color={color}
            roof={profile.roof}
          />
          <path
            d={`M50 ${87 - landmarkHeight - 4}v-12`}
            stroke="#466453"
            strokeWidth="1.8"
          />
          <path
            d={`m51 ${87 - landmarkHeight - 15} 12 3-12 5Z`}
            fill={ownerColor || color}
          />
          <path d={`m46 ${87 - landmarkHeight} 4-2 4 2-4 2Z`} fill="#ffe4a1" />
        </>
      )}
      <path d="m18 98 22 11" stroke={ownerColor || color} strokeWidth="3" />
    </svg>
  );
}
