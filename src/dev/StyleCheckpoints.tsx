import { FoodStudyMiniature } from "./FoodStudyMiniature";
import { MiniatureBuilding } from "../components/tabletop/MiniatureBuilding";
import { CornerMonument } from "../components/tabletop/CornerMonument";
import { PlayerToken } from "../components/tabletop/PlayerToken";
import { colors } from "../lib/board";
import type { Player } from "../types/game";
import { proposedDistricts as districts } from "./board36Proposal";
import "./styleCheckpoints.css";

const players = ["Quan", "Alex", "Jordan", "Sam"].map(
  (name, seat) =>
    ({
      id: `study-${seat}`,
      name,
      seat,
      character: ["runner", "cyclist", "engineer", "robot"][seat],
      position: 0,
      cash: 1500,
      last_seen_at: "",
    }) as Player,
);
function StudyMiniature({
  district,
  level,
  name,
}: {
  district: string;
  level: number;
  name: string;
}) {
  const g = districts.find((g) => g.id === district)!;
  return (
    <div className={`study-miniature ${g.count === 2 ? "premium-model" : ""}`}>
      {district === "food" ? (
        <FoodStudyMiniature name={name} level={level} color={g.color} />
      ) : g.count === 2 && level >= 4 ? (
        <svg viewBox="0 0 100 110" aria-hidden="true">
          <ellipse cx="53" cy="98" rx="36" ry="9" fill="#244a3430" />
          <path d="m10 86 40 20 40-20v5l-40 20-40-20Z" fill="#789080" />
          <path d="m25 24 29 14v61L25 85Z" fill="#f3e3bd" stroke="#adad8e" />
          <path d="m54 38 25-13v60L54 99Z" fill="#97b9ac" stroke="#708e7c" />
          <path
            d="m20 24 29-15 35 16-30 16Z"
            fill={g.color}
            stroke="#345947"
            strokeWidth="2"
          />
          {[0, 1, 2, 3].map((row) => (
            <g key={row} transform={`translate(0 ${row * 11})`}>
              <path d="m31 36 6 3v6l-6-3Zm12 6 6 3v6l-6-3Z" fill="#608f96" />
              <path d="m60 46 6-3v6l-6 3Zm11-6 5-2v6l-5 2Z" fill="#ddeacb" />
            </g>
          ))}
          <path d="m38 73 9 4v18l-9-4Z" fill="#365d48" />
          {name === "Alumni Hall" ? (
            <g>
              <path d="m32 27 11 5v16l-11-5Z" fill="#f7ebc7" />
              <ellipse
                cx="37.5"
                cy="37"
                rx="4"
                ry="5.5"
                fill="#fff7df"
                stroke="#715b40"
              />
              <path d="M37.5 33v4l2 2" stroke="#715b40" fill="none" />
            </g>
          ) : (
            <g>
              <path d="m28 72 24 12v-7L28 65Z" fill="#e8cf9c" />
              {[0, 1, 2].map((i) => (
                <path
                  key={i}
                  d={`m${31 + i * 7} ${72 + i * 3.5}v14`}
                  stroke="#fff0cf"
                  strokeWidth="3"
                />
              ))}
            </g>
          )}
          <path d="m9 76 17-8 15 8-17 8Z" fill={g.color} />
          <path d="m9 76 15 8v13L9 89Z" fill="#eee0ba" />
          <path d="m24 84 17-8v13l-17 8Z" fill="#99b6a6" />
          {level === 5 && (
            <>
              <path d="M49 13V0" stroke="#496949" strokeWidth="2" />
              <path d="m50 1 15 3-15 5Z" fill={g.color} />
              <path d="m37 19 12-6 16 7-12 6Z" fill="#efd497" />
            </>
          )}
        </svg>
      ) : (
        <MiniatureBuilding
          level={level}
          color={g.color}
          district={district}
          ownerColor={g.color}
        />
      )}
      {level > 0 && name.includes("Observatory") && (
        <svg
          className="study-identity"
          viewBox="0 0 100 110"
          aria-hidden="true"
        >
          <path
            d="M30 48a18 16 0 0 1 36 0Z"
            fill="#80c6d6"
            stroke="#275c71"
            strokeWidth="2"
          />
          <path
            d="m49 37 14-10 7 6-14 10Z"
            fill="#eceddc"
            stroke="#275c71"
            strokeWidth="2"
          />
          <path d="M49 37v12" stroke="#275c71" strokeWidth="2" />
        </svg>
      )}
    </div>
  );
}
function StudyTile({
  name,
  district = "food",
  level = 0,
  owner,
  type = "property",
  subtitle,
  crowd = false,
}: {
  name: string;
  district?: string;
  level?: number;
  owner?: number;
  type?: string;
  subtitle?: string;
  crowd?: boolean;
}) {
  const g = districts.find((g) => g.id === district)!;
  const special = type !== "property";
  return (
    <article
      className={`study-card ${crowd ? "crowd-study" : ""}`}
      style={{ "--district": g.color } as React.CSSProperties}
    >
      <div className="study-tile" data-study-tile>
        <svg
          className="study-surface"
          viewBox="0 0 280 180"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M6 80 140 155 274 80v12l-134 75L6 92Z" fill="#607966" />
          <path
            d="M140 6 274 80 140 155 6 80Z"
            fill={special ? "#e4e9dd" : "#fff5df"}
            stroke="#b5bca5"
            strokeWidth="1.5"
          />
          {!special && (
            <path
              d="M10 81 140 10 270 81"
              fill="none"
              stroke={g.color}
              strokeWidth="9"
            />
          )}
          <path d="M6 80 140 155" stroke="#dee3c8" strokeWidth="2" />
        </svg>
        <div className="study-building-zone">
          {type === "start" ? (
            <svg viewBox="0 0 100 110" aria-hidden="true">
              <ellipse cx="52" cy="98" rx="40" ry="9" fill="#2a503c30" />
              <path d="m5 83 45 23 45-23v5l-45 23L5 88Z" fill="#859881" />
              <path d="m14 37 14 7v49l-14-7Z" fill="#f6e4ba" />
              <path d="m28 44 12-6v49l-12 6Z" fill="#a9bea6" />
              <path d="m62 37 14 7v49l-14-7Z" fill="#f6e4ba" />
              <path d="m76 44 12-6v49l-12 6Z" fill="#9ab49e" />
              <path d="m10 36 14-8 19 9-15 9Z" fill="#3c7955" />
              <path d="m58 36 14-8 19 9-15 9Z" fill="#3c7955" />
              <path
                d="m27 40 37 18 9-5v-9L36 26l-9 5Z"
                fill="#e8d3a4"
                stroke="#ab9e7a"
              />
              <path d="m27 31 37 18 9-5-37-18Z" fill="#588960" />
              <path d="M24 29V8" stroke="#476b4e" strokeWidth="2" />
              <path d="m25 9 17 5-17 6Z" fill="#dbad4d" />
              <path
                d="m36 83 14 7 16-8"
                stroke="#c7b988"
                strokeWidth="6"
                fill="none"
              />
            </svg>
          ) : type === "airport" ? (
            <CornerMonument kind={type} />
          ) : type === "station" ? (
            <svg viewBox="0 0 100 110" aria-hidden="true">
              <ellipse cx="52" cy="94" rx="35" ry="9" fill="#1e493631" />
              <path d="m12 76 38 19 38-19v10L50 105 12 86Z" fill="#84968a" />
              <path d="m20 43 30 15v30L20 73Z" fill="#f5e4bf" />
              <path d="m50 58 28-14v30L50 88Z" fill="#abc1b4" />
              <path d="m15 42 29-16 38 18-32 17Z" fill="#557c76" />
              <path d="m26 55 18 9v11l-18-9Z" fill="#5d939b" />
              <path d="M43 34v-9m-6 3h12" stroke="#284d41" strokeWidth="2" />
            </svg>
          ) : special ? (
            <svg viewBox="0 0 100 110" aria-hidden="true">
              <ellipse cx="50" cy="94" rx="26" ry="7" fill="#274c3526" />
              <path d="m20 72 30 16 30-16v6L50 94 20 78Z" fill="#789381" />
              <path
                d="m29 29 27 13v43L29 72Z"
                fill="#fff4da"
                stroke="#547b61"
                strokeWidth="2"
              />
              <path d="m56 42 15-8v43l-15 8Z" fill="#a4b7a4" />
              <text
                x="43"
                y="63"
                textAnchor="middle"
                fill="#315c46"
                fontSize="23"
                fontWeight="700"
              >
                {type === "fee" ? "$" : type === "event" ? "★" : "P"}
              </text>
            </svg>
          ) : (
            <StudyMiniature name={name} district={district} level={level} />
          )}
        </div>
        <div className="study-print">
          <strong>{name}</strong>
          <small>
            {subtitle ||
              (special
                ? type === "airport"
                  ? "Fast Travel"
                  : type === "start"
                    ? "+$100"
                    : type === "station"
                      ? "$200"
                      : type === "fee"
                        ? "−$75"
                        : "Draw"
                : `$${g.price}`)}
          </small>
        </div>
        {owner !== undefined && (
          <span
            className="study-owner-flag"
            aria-label={`Owned by ${players[owner].name}`}
            style={{ "--owner-color": colors[owner] } as React.CSSProperties}
          >
            <svg viewBox="0 0 24 32" aria-hidden="true">
              <ellipse cx="12" cy="29" rx="8" ry="3" fill="#284c3529" />
              <path d="M8 28V3" stroke="#385847" strokeWidth="2" />
              <path d="m9 4 13 4-13 5Z" fill={colors[owner]} />
            </svg>
          </span>
        )}
        {crowd && (
          <div className="study-pawn-zone">
            {players.map((p) => (
              <PlayerToken key={p.id} player={p} />
            ))}
          </div>
        )}
      </div>
      <footer>
        {special ? type : g.name}
        {owner !== undefined ? ` · ${players[owner].name} owns` : " · Unowned"}
        {!special ? ` · L${level}` : ""}
      </footer>
    </article>
  );
}
function Checkpoint({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="style-checkpoint">
      <h2>{title}</h2>
      <p>{note}</p>
      <div className="study-row">{children}</div>
    </section>
  );
}
export default function StyleCheckpoints() {
  return (
    <main className="style-checkpoints">
      <header>
        <a href="/">CampusStack</a>
        <span>Structure approved · Art pending · Economy experimental</span>
        <a href="/__dev/tabletop">Current camera</a>
      </header>
      <h1>One district. One color. Real pieces.</h1>
      <p className="study-intro">
        Enlarged art studies at the current diamond angle. These fixtures never
        load a room or change the active 40-space game. Final 36-space fitting
        follows layout and style approval.
      </p>
      <nav>
        {[
          "district",
          "ownership",
          "type",
          "development",
          "premium",
          "corners",
          "players",
        ].map((id) => (
          <a key={id} href={`#${id}`}>
            {id}
          </a>
        ))}
      </nav>
      <Checkpoint
        id="district"
        title="A · Complete Food Court"
        note="One orange district band; three property identities: café, pizzeria, and library/café. Ownership and development remain separate."
      >
        {["Eng. Café", "Green Street", "Library Café"].map((name) => (
          <StudyTile key={name} name={name} level={1} />
        ))}
      </Checkpoint>
      <Checkpoint
        id="ownership"
        title="B · District stays orange"
        note="Unowned, Player 1, Player 2: same permanent district band. Ownership uses one small flag, never a second border."
      >
        {[undefined, 0, 1].map((owner, i) => (
          <StudyTile key={i} name="Eng. Café" owner={owner} level={1} />
        ))}
      </Checkpoint>
      <Checkpoint
        id="type"
        title="C · Name first, price second"
        note="Upright, high-contrast type; separate structure, printed-name, price and ownership zones. Specials use neutral surfaces."
      >
        <StudyTile name="Bio Lab" district="science" level={1} />
        <StudyTile name="Observatory" district="science" level={1} />
        <StudyTile name={"Student\nApartments"} district="housing" level={1} />
        <StudyTile name="West Station" type="station" />
        <StudyTile name="Campus Bulletin" type="event" />
        <StudyTile name="Lab Fee" type="fee" />
      </Checkpoint>
      <Checkpoint
        id="development"
        title="D · A property transforms"
        note="Engineering Café keeps its café identity: L0 empty, L1 one structure, L2 two, L3 a complex, L4 mid-rise, L5 Food Hall. Development changes the silhouette, not the set or owner identity."
      >
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <StudyTile
            key={level}
            name="Eng. Café"
            district="food"
            level={level}
          />
        ))}
      </Checkpoint>
      <Checkpoint
        id="premium"
        title="E · Premium Union Square"
        note="Two adjacent properties on the final side. Taller Landmark forms; one rose district color. Purchase candidate: $320. Rent and development costs are unapproved; Union $1,600 and Green $2,000 L5 are experimental, pending simulation."
      >
        <StudyTile name="Student Union" district="social" level={5} />
        <StudyTile name="Alumni Hall" district="social" level={5} />
      </Checkpoint>
      <Checkpoint
        id="corners"
        title="F · Meaning through miniature scenes"
        note="Campus entrance and airport terminal/control tower. Neutral surfaces, concise labels, and a small plane on the Airport study."
      >
        <StudyTile name="START" type="start" />
        <div className="airport-study">
          <StudyTile name="AIRPORT" type="airport" />
          <svg className="study-plane" viewBox="0 0 64 64" aria-hidden="true">
            <ellipse cx="33" cy="49" rx="24" ry="7" fill="#32584224" />
            <path
              d="m12 38 23-13 7-18 6 3-3 17 13 7-6 4-12-3-16 11-3 8-6-3 1-7-10-2Z"
              fill="#f5f5de"
              stroke="#497d85"
              strokeWidth="2"
            />
          </svg>
        </div>
      </Checkpoint>
      <Checkpoint
        id="players"
        title="G · Four pieces, one property"
        note="Thick colored bases and illustrated standing bodies, with a separate shared-player lane. All four pieces remain visible; no overlap with the property print or miniature."
      >
        <StudyTile
          name="Student Apts"
          district="housing"
          level={3}
          owner={0}
          crowd
        />
      </Checkpoint>
    </main>
  );
}
