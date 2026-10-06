import type { ReactNode } from "react";
import { TileLabel } from "./TileLabel";

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
      <TileLabel label={label} subtitle={subtitle} />
    </span>
  );
}
