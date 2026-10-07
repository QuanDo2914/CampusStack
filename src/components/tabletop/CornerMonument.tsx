// Original scenes selected by space kind, independent of board indices/names.
export function CornerMonument({ kind }: { kind: string }) {
  const airport = kind === "airport",
    security = kind === "go_to_jail",
    visiting = kind === "jail";
  return (
    <svg
      className={`corner-monument monument-${kind}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <ellipse cx="54" cy="90" rx="38" ry="9" fill="#264e38" opacity=".2" />
      <path d="m6 77 44-22 44 22-44 22Z" fill="#d7d7bc" />
      <path d="m6 77 44 22v4L6 81Z" fill="#a3b099" />
      <path d="m50 99 44-22v4l-44 22Z" fill="#768f74" />
      {airport ? (
        <>
          <path d="m13 58 29 14v17L13 75Z" fill="#fff0d0" />
          <path d="m42 72 24-12v17L42 89Z" fill="#b3ccc5" />
          <path d="m10 58 25-13 34 15-27 14Z" fill="#388f9b" />
          <path d="m58 28 12 6v48l-12-6Z" fill="#f1e6c6" />
          <path d="m70 34 12-6v48l-12 6Z" fill="#8ab5b7" />
          <path d="m53 25 16-8 18 9-17 9Z" fill="#407586" />
          <path d="m58 28 12 6 12-6v12l-12 6-12-6Z" fill="#a5d8d9" />
          <path d="m18 58 14-7 16 8-16 8Z" fill="#dbece5" />
          <path d="m19 72 18 9" stroke="#73a2ad" strokeWidth="5" />
        </>
      ) : visiting ? (
        <>
          <path d="m20 40 29 14v32L20 72Z" fill="#f2e4c3" />
          <path d="m49 54 30-15v32L49 86Z" fill="#b8c8b3" />
          <path d="m16 39 31-16 35 16-33 17Z" fill="#b58b45" />
          <path d="m26 52 17 8v15l-17-8Zm28 10 18-9v14l-18 9Z" fill="#54746e" />
          <path
            d="m30 54v15m6-12v15m24-14v15m6-18v15"
            stroke="#e2dfc5"
            strokeWidth="2"
          />
        </>
      ) : security ? (
        <>
          <path d="m18 45 26 13v28L18 73Z" fill="#f3dfc0" />
          <path d="m44 58 25-13v28L44 86Z" fill="#c5b9a6" />
          <path d="m14 44 27-14 33 16-30 15Z" fill="#b27153" />
          <path d="m52 19 12 6v41l-12-6Z" fill="#e6cdad" />
          <path d="m64 25 12-6v41l-12 6Z" fill="#adada0" />
          <path d="m48 18 14-7 18 8-16 8Z" fill="#824d3d" />
          <path d="m23 57 14 7v12l-14-7Z" fill="#79999c" />
          <path d="m59 31 5 3v12l-5-3Z" fill="#4f7477" />
        </>
      ) : (
        <>
          <path d="m18 43 31 16v30L18 73Z" fill="#fff0c9" />
          <path d="m49 59 31-16v30L49 89Z" fill="#bdd0b6" />
          <path d="m12 42 34-17 40 19-37 18Z" fill="#377952" />
          <path d="m28 58 12 6v18l-12-6Z" fill="#244e3c" />
          <path d="m54 66 17-8v12l-17 8Z" fill="#72a4aa" stroke="#e5efdb" />
          <path d="M48 27V8" stroke="#315d47" strokeWidth="2" />
          <path d="m49 9 20 5-20 6Z" fill="#efc45e" />
        </>
      )}
    </svg>
  );
}
