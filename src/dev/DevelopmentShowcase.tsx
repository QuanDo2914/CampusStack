import { useState } from "react";
import {
  MiniatureBuilding,
  architecture,
} from "../components/tabletop/MiniatureBuilding";
import { groups, campusBoard } from "../lib/expanded";
// Isolated rendering fixture: no server, room, identity or economics changes.
export default function DevelopmentShowcase() {
  const [district, setDistrict] = useState("innovation");
  const group = groups.find((g) => g.id === district)!;
  return (
    <main className="development-showcase">
      <header>
        <a href="/">CampusStack</a>
        <a href="/__dev/tabletop">Full board</a>
        <a href="/__dev/tiles">40-space audit</a>
      </header>
      <h1>From a campus spot to a Landmark.</h1>
      <p>
        {
          campusBoard.find(
            (b) => b.kind === "property" && b.category === district,
          )?.name
        }{" "}
        art study · real 2:1 board projection · light from upper-left
      </p>
      <label>
        District{" "}
        <select value={district} onChange={(e) => setDistrict(e.target.value)}>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <section className="development-levels">
        {Array.from({ length: 6 }, (_, level) => (
          <article key={level}>
            <div className="showcase-space">
              <svg
                className="showcase-tile"
                viewBox="0 0 200 160"
                aria-hidden="true"
              >
                <path d="m4 90 96 48 96-48v9l-96 48-96-48Z" fill="#7b937d" />
                <path
                  d="M100 42 196 90 100 138 4 90Z"
                  fill="#fff6df"
                  stroke="#afbfaa"
                />
                <path
                  d="M8 91 100 137 192 91"
                  fill="none"
                  stroke={group.color}
                  strokeWidth="4"
                />
              </svg>
              <div className="showcase-building">
                <MiniatureBuilding
                  level={level}
                  color={group.color}
                  district={district}
                  ownerColor="#19694d"
                />
              </div>
            </div>
            <strong>Level {level}</strong>
            <span>
              {
                [
                  "Open plot",
                  "One building",
                  "Two buildings",
                  "Campus block",
                  "Mid-rise",
                  architecture[district].landmark,
                ][level]
              }
            </span>
          </article>
        ))}
      </section>
      <p className="showcase-note">
        One reusable model system. Roof treatments follow district architecture;
        silhouettes communicate development without a number. Full names and
        economics remain in the deed.
      </p>
    </main>
  );
}
