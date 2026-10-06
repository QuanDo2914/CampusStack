import type { ReactNode } from "react";

// Presentation-only composition: labels and emblem come from the board renderer.
// Future themes can replace the supplied artwork/copy without changing this tile.
export function CornerTile({
  emblem,
  label,
  subtitle,
}: {
  emblem: ReactNode;
  label: string;
  subtitle?: string;
}) {
  return (
    <span className="corner-face">
      <span className="corner-emblem" aria-hidden="true">
        {emblem}
      </span>
      <span className="tile-copy">
        <strong>{label}</strong>
        {subtitle && <small>{subtitle}</small>}
      </span>
    </span>
  );
}
