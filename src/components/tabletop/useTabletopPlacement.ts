import { useLayoutEffect, type RefObject } from "react";
import { diamondFacePath } from "./diamondGeometry";
type P = { x: number; y: number };
type Box = { left: number; top: number; width: number; height: number };
function poly(r: Box, angle = 0): P[] {
  const c = Math.cos(angle),
    s = Math.sin(angle),
    a = Math.abs(c),
    b = Math.abs(s),
    d = a * a - b * b;
  const w = (a * r.width - b * r.height) / d,
    h = (a * r.height - b * r.width) / d,
    x = r.left + r.width / 2,
    y = r.top + r.height / 2;
  return [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([u, v]) => ({ x: x + u * c - v * s, y: y + u * s + v * c }));
}
const boundsCache = new WeakMap<
  P[],
  { left: number; right: number; top: number; bottom: number }
>();
function bounds(p: P[]) {
  let b = boundsCache.get(p);
  if (!b) {
    b = {
      left: Math.min(...p.map((v) => v.x)),
      right: Math.max(...p.map((v) => v.x)),
      top: Math.min(...p.map((v) => v.y)),
      bottom: Math.max(...p.map((v) => v.y)),
    };
    boundsCache.set(p, b);
  }
  return b;
}
function overlap(a: P[], b: P[]): boolean {
  const aa = bounds(a),
    bb = bounds(b);
  if (
    aa.right + 1 < bb.left ||
    bb.right + 1 < aa.left ||
    aa.bottom + 1 < bb.top ||
    bb.bottom + 1 < aa.top
  )
    return false;
  return ![a, b].some((p) =>
    p.some((v, i) => {
      const n = p[(i + 1) % p.length],
        axis = { x: -(n.y - v.y), y: n.x - v.x },
        project = (q: P[]) => q.map((t) => t.x * axis.x + t.y * axis.y),
        aa = project(a),
        bb = project(b),
        gap = 0;
      return (
        Math.max(...aa) <= Math.min(...bb) + gap ||
        Math.max(...bb) <= Math.min(...aa) + gap
      );
    }),
  );
}
const moved = (p: P[], dx: number, dy: number) =>
  p.map((v) => ({ x: v.x + dx, y: v.y + dy }));
function svgPoly(svg: SVGGraphicsElement): P[] {
  const b = svg.getBBox(),
    m = svg.getScreenCTM()!;
  const a = new DOMPoint(b.x, b.y).matrixTransform(m),
    z = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m);
  return poly({ left: a.x, top: a.y, width: z.x - a.x, height: z.y - a.y });
}
const foot = (svg: SVGGraphicsElement, x: number, y: number): P =>
  new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!);
function inside(point: P, outline: P[]): boolean {
  let yes = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i],
      b = outline[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      yes = !yes;
  }
  return (
    yes &&
    outline.every((a, i) => {
      const b = outline[(i + 1) % outline.length],
        dx = b.x - a.x,
        dy = b.y - a.y,
        t = Math.max(
          0,
          Math.min(
            1,
            ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy),
          ),
        );
      return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy) > 1;
    })
  );
}

// Responsive, deterministic billboard packing. The surface geometry never moves.
// Buildings and pawns may stand above the plane; their feet must belong to their
// actual tile. Actual glyph bounds protect both adjacent labels and special icons.
export function placeTabletopObjects(
  root: HTMLElement,
  priority = new Set<string>(),
  attempt = 0,
) {
  const rank = (tile: HTMLElement) =>
    tile.dataset.corner !== undefined
      ? 0
      : priority.has(tile.dataset.testid!)
        ? 0.5
        : Number(tile.dataset.cornerDistance);
  const tiles = [...root.querySelectorAll<HTMLElement>(".isometric-tile")].sort(
      (a, b) => rank(a) - rank(b),
    ),
    content: P[][] = [],
    reserved: P[][] = [];
  const outlines = new Map<HTMLElement, P[]>();
  for (const tile of tiles) {
    const r = tile.getBoundingClientRect(),
      index = Number(tile.dataset.testid?.replace("space-", ""));
    const coords = diamondFacePath(index, tile.dataset.edge!)
      .match(/-?\d+/g)!
      .map(Number);
    outlines.set(
      tile,
      Array.from({ length: coords.length / 2 }, (_, i) => ({
        x: r.x + (coords[i * 2] * r.width) / 100,
        y: r.y + (coords[i * 2 + 1] * r.height) / 100,
      })),
    );
    const face = tile.querySelector<HTMLElement>(".tile-face,.corner-face")!,
      m = new DOMMatrix(getComputedStyle(face).transform),
      angle = Math.atan2(m.b, m.a);
    for (const text of face.querySelectorAll(".tile-title,.tile-copy small")) {
      const range = document.createRange();
      range.selectNodeContents(text);
      content.push(...[...range.getClientRects()].map((r) => poly(r, angle)));
    }
    const icon = face.querySelector<HTMLElement>(".tile-emblem,.corner-emblem");
    if (icon && getComputedStyle(icon).display !== "none")
      content.push(poly(icon.getBoundingClientRect(), angle));
  }
  const candidates = (tile: HTMLElement, wanted: P) => {
    const r = tile.getBoundingClientRect(),
      result: P[] = [];
    // Even grid in projected screen space, constrained by the real face polygon.
    for (let x = -20; x <= 120; x += 4)
      for (let y = -44; y <= 144; y += 4) {
        const p = {
          x: r.x + (x * r.width) / 100,
          y: r.y + (y * r.height) / 100,
        };
        if (inside(p, outlines.get(tile)!)) result.push(p);
      }
    return result.sort(
      (a, b) =>
        Math.hypot(a.x - wanted.x, a.y - wanted.y) -
        Math.hypot(b.x - wanted.x, b.y - wanted.y),
    );
  };
  const fit = (
    tile: HTMLElement,
    marker: HTMLElement | SVGSVGElement,
    feet: P[],
    shapes: P[][],
    solids = shapes,
    roomFor: P[][][] = [],
  ) => {
    const wanted = {
      x: feet.reduce((sum, p) => sum + p.x, 0) / feet.length,
      y: feet.reduce((sum, p) => sum + p.y, 0) / feet.length,
    };
    const available = candidates(tile, wanted);
    const choice = available.find((p) => {
      const dx = p.x - wanted.x,
        dy = p.y - wanted.y;
      return (
        feet.every((f) =>
          inside({ x: f.x + dx, y: f.y + dy }, outlines.get(tile)!),
        ) &&
        shapes.every(
          (shape) =>
            ![...content, ...reserved].some((zone) =>
              overlap(moved(shape, dx, dy), zone),
            ),
        ) &&
        (!roomFor.length ||
          roomFor.some((option) =>
            option.every(
              (shape) =>
                !solids.some((zone) => overlap(shape, moved(zone, dx, dy))),
            ),
          ))
      );
    });
    marker.dataset.placement = choice ? "clear" : "unresolved";
    if (!choice) return;
    const dx = choice.x - wanted.x,
      dy = choice.y - wanted.y;
    const style = getComputedStyle(marker);
    marker.style.left = `${parseFloat(style.left) + dx}px`;
    marker.style.top = `${parseFloat(style.top) + dy}px`;
    reserved.push(...solids.map((p) => moved(p, dx, dy)));
  };
  // Reset to CSS-authored preferred lanes before every independent layout pass.
  root
    .querySelectorAll<HTMLElement>(
      ".tile-buildings,.corner-monument,.campus-tokens",
    )
    .forEach((m) => {
      m.style.left = "";
      m.style.top = "";
    });
  for (const tile of tiles) {
    const tokens = tile.querySelector<HTMLElement>(".campus-tokens")!,
      pieces = [
        ...tokens.querySelectorAll<SVGSVGElement>(".piece-position svg"),
      ];
    const feet = pieces.map((svg) => foot(svg, 32, 74)),
      pawnShapes = pieces.map(svgPoly);
    const wanted = feet.length
      ? {
          x: feet.reduce((sum, p) => sum + p.x, 0) / feet.length,
          y: feet.reduce((sum, p) => sum + p.y, 0) / feet.length,
        }
      : null;
    const roomFor = wanted
      ? candidates(tile, wanted).flatMap((p) => {
          const dx = p.x - wanted.x,
            dy = p.y - wanted.y,
            shapes = pawnShapes.map((shape) => moved(shape, dx, dy));
          return feet.every((f) =>
            inside({ x: f.x + dx, y: f.y + dy }, outlines.get(tile)!),
          ) &&
            shapes.every(
              (shape) =>
                ![...content, ...reserved].some((zone) => overlap(shape, zone)),
            )
            ? [shapes]
            : [];
        })
      : [];
    const marker =
      tile.querySelector<HTMLElement>(".tile-buildings") ||
      tile.querySelector<SVGSVGElement>(".corner-monument");
    if (marker) {
      const svg = marker.matches("svg")
        ? (marker as SVGSVGElement)
        : marker.querySelector<SVGSVGElement>("svg")!;
      fit(
        tile,
        marker,
        [foot(svg, 50, 98)],
        [svgPoly(svg)],
        marker.matches("svg")
          ? [svgPoly(svg)]
          : [
              ...svg.querySelectorAll<SVGGraphicsElement>(".mini-structure"),
            ].map(svgPoly),
        roomFor,
      );
    }
    if (pieces.length) fit(tile, tokens, feet, pawnShapes);
  }
  const failed = [
    ...root.querySelectorAll<HTMLElement>('[data-placement="unresolved"]'),
  ].map((m) => m.closest<HTMLElement>(".isometric-tile")!.dataset.testid!);
  if (failed.length && attempt < 2) {
    failed.forEach((id) => priority.add(id));
    placeTabletopObjects(root, priority, attempt + 1);
  }
}
export function useTabletopPlacement(
  root: RefObject<HTMLDivElement | null>,
  key: string | number,
) {
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0,
      active = true;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (active) placeTabletopObjects(element);
      });
    };
    const observer = new ResizeObserver(run);
    observer.observe(element);
    document.fonts.ready.then(run);
    run();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [root, key]);
}
