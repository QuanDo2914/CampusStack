// Original CampusStack vector stickers. All geometry is authored for this project.
export function CampusIcon({
  kind = "property",
  category = "",
  name = "",
  className = "",
}: {
  kind?: string;
  category?: string;
  name?: string;
  className?: string;
}) {
  let art: React.ReactNode;
  if (kind === "start")
    art = (
      <>
        <path d="M7 51h50M12 51V27l20-14 20 14v24M22 51V32h20v19" />
        <path d="M19 21h26M28 38h8M32 9v-6l13 4-13 4" />
        <circle cx="32" cy="25" r="3" />
      </>
    );
  else if (kind === "airport")
    art = (
      <>
        <path d="m9 35 19-8V10c0-7 8-7 8 0v17l19 8v7l-19-4v12l7 5v4l-11-3-11 3v-4l7-5V38L9 42Z" />
        <path d="M7 56h10M47 56h10" />
      </>
    );
  else if (kind === "go_to_jail")
    art = (
      <>
        <path d="M12 52h40M17 48V24h30v24M14 24l18-13 18 13M25 48V35h14v13" />
        <path d="M25 27h14M32 6v4" />
        <circle cx="32" cy="17" r="3" />
      </>
    );
  else if (kind === "jail")
    art = (
      <>
        <path d="M10 52h44M14 52V17h36v35M10 17h44M22 26v19M32 26v19M42 26v19M14 46h36" />
        <path d="M22 9h20" />
      </>
    );
  else if (kind === "station")
    art = (
      <>
        <path d="M15 42V20q0-9 9-9h16q9 0 9 9v22q0 7-8 7H23q-8 0-8-7Z" />
        <path d="M20 18h24v14H20ZM22 50l-7 9M42 50l7 9M22 55h20" />
        <circle cx="23" cy="40" r="3" />
        <circle cx="41" cy="40" r="3" />
      </>
    );
  else if (kind === "event")
    art = (
      <>
        <path d="m15 10 35 6-7 42-35-6Z" />
        <path d="m31 23 3 7 8 1-6 5 1 8-7-4-7 4 1-8-6-5 8-1Z" />
        <path d="m52 6 2 6 6 2M4 25l5 1" />
      </>
    );
  else if (kind === "fee")
    art = (
      <>
        <path d="M17 9h30v45l-5-4-5 4-5-4-5 4-5-4-5 4Z" />
        <path d="M24 19h16M24 26h11M24 43h16" />
        <circle cx="32" cy="35" r="4" />
      </>
    );
  else if (kind === "parking")
    art = (
      <>
        <path d="M8 48h48M13 48V32h38v16M8 32h48M20 32v-7M44 32v-7M17 54v-6M47 54v-6" />
        <path d="M32 28V10M32 22q-14 0-15-12 15-1 15 12M32 18Q46 18 47 6 32 5 32 18" />
      </>
    );
  else if (category === "food")
    art = /Pizza/.test(name) ? (
      <>
        <path d="m12 15 43 3-22 39Z" />
        <path d="M12 15q21-9 43 3M17 24l31 2" />
        <circle cx="28" cy="31" r="4" />
        <circle cx="36" cy="41" r="3" />
      </>
    ) : (
      <>
        <path d="M13 27h31v14q0 10-15 10T13 41ZM44 29h5q11 0 5 12l-10 3M8 55h43M21 19q-5-6 0-12M34 19q-5-6 0-12" />
      </>
    );
  else if (category === "wellness")
    art = (
      <>
        <path d="M22 30h20M22 37h20M10 23h8v22h-8ZM18 19h6v30h-6ZM40 19h6v30h-6ZM46 23h8v22h-8Z" />
        <path d="m27 15 5-8 5 8" />
      </>
    );
  else if (category === "arts")
    art = /Music/.test(name) ? (
      <>
        <path d="M24 45V17l27-6v27M24 24l27-6" />
        <ellipse cx="17" cy="46" rx="8" ry="6" />
        <ellipse cx="44" cy="40" rx="8" ry="6" />
      </>
    ) : (
      <>
        <path d="M33 10C9 8 2 33 13 48c8 12 21 9 19-1-2-7 1-10 9-7 20 6 18-25-8-30Z" />
        <circle cx="20" cy="24" r="3" />
        <circle cx="33" cy="20" r="3" />
        <circle cx="44" cy="27" r="3" />
        <circle cx="15" cy="36" r="3" />
      </>
    );
  else if (category === "housing")
    art = (
      <>
        <path d="M10 53h44M16 53V18h32v35M11 18l21-9 21 9M27 53V41h10v12M22 25h5v5h-5ZM37 25h5v5h-5ZM22 34h5M37 34h5" />
      </>
    );
  else if (category === "science")
    art = (
      <>
        <path d="M25 9h14M28 9v19L13 48q-4 7 5 7h28q9 0 5-7L36 28V9M21 39h22" />
        <circle cx="29" cy="46" r="3" />
        <circle cx="37" cy="35" r="2" />
        <path d="m46 10 3 5 6 1-5 4 1 6" />
      </>
    );
  else if (category === "innovation")
    art = (
      <>
        <path d="M20 49h24M23 55h18M23 42C3 23 22 7 32 9c22 1 27 22 9 33v7H23ZM27 40V29h10v11M7 20l6 3M51 23l6-3M32 2v4" />
      </>
    );
  else if (category === "green")
    art = (
      <>
        <path d="M32 56V31M32 43 20 31M32 36l13-12M32 31Q11 31 10 10q22-1 22 21ZM34 24Q34 6 54 7q-1 19-20 17Z" />
        <path d="M16 56h32" />
      </>
    );
  else
    art = (
      <>
        <path d="M9 52h46M15 52V25l17-13 17 13v27M24 52V37h16v15M22 27h20M28 5h8" />
        <path d="M7 31h8M49 31h8" />
      </>
    );
  return (
    <svg
      className={`campus-sticker ${className}`}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {art}
    </svg>
  );
}
