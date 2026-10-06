import { useLayoutEffect, useRef, useState } from "react";

// Fit the longest word in a narrow, readable range. Natural wrapping handles
// the second line; neither names nor economics are clipped or horizontally scaled.
export function TileLabel({
  label,
  subtitle,
}: {
  label: string;
  subtitle?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<number>();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;
    const fit = () => {
      const style = getComputedStyle(element);
      const max = innerWidth >= 1700 ? 12 : 11;
      context.font = `750 ${max}px ${style.fontFamily}`;
      const widest = Math.max(
        ...label.split(/\s+/).map((word) => context.measureText(word).width),
      );
      const width = element.clientWidth - 1;
      const widthSize = Math.min(max, Math.max(9.5, (max * width) / widest));
      context.font = `750 ${widthSize}px ${style.fontFamily}`;
      let lines = 1,
        line = "";
      for (const word of label.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && context.measureText(next).width > width) {
          lines++;
          line = word;
        } else line = next;
      }
      const tile = element.closest<HTMLElement>(".tabletop-tile")!;
      const titleHeight = tile.clientHeight - 3 - (subtitle ? 10.5 : 0);
      const fitted = Math.min(
        widthSize,
        Math.max(9.5, titleHeight / Math.min(2, lines) / 1.05),
      );
      setSize(Math.round(fitted * 100) / 100);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    fit();
    let active = true;
    document.fonts.ready.then(() => {
      if (active) fit();
    });
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [label, subtitle]);
  return (
    <span ref={ref} className="tile-copy">
      <strong
        className="tile-title"
        style={size ? { fontSize: `${size}px` } : undefined}
      >
        {label}
      </strong>
      {subtitle && <small>{subtitle}</small>}
    </span>
  );
}
