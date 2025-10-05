import type { Point } from "./types";
import { P } from "./types";
import { insertPoint, enforceEdge } from "./geometry";
import { EdgeContext } from "./edgeContext";

export function insertSquare(
  ctx: EdgeContext,
  x: number,
  y: number,
  size: number,
): void {
  const coords = [x, y, x + size, y, x + size, y + size, x, y + size];

  for (let i = 0; i < coords.length; i += 2) {
    const px = coords[i]!;
    const py = coords[i + 1]!;
    insertPoint(ctx, px, py);
  }

  for (let i = 0; i < coords.length; i += 2) {
    const ax = coords[i]!;
    const ay = coords[i + 1]!;
    const bx = coords[(i + 2) % coords.length]!;
    const by = coords[(i + 3) % coords.length]!;
    enforceEdge(ctx, ax, ay, bx, by);
  }
}

export function insertPolygon(ctx: EdgeContext, points: Point[]): void {
  for (const point of points) {
    insertPoint(ctx, point.x, point.y);
  }
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    enforceEdge(ctx, a.x, a.y, b.x, b.y);
  }
}

export function insertOctagon(
  ctx: EdgeContext,
  x: number,
  y: number,
  size: number,
): void {
  const sqrt2 = Math.sqrt(2);
  const a = size / (sqrt2 + 1);
  const coords = [
    a / sqrt2 + x,
    0 + y,
    a + a / sqrt2 + x,
    0 + y,
    size + x,
    a / sqrt2 + y,
    size + x,
    a / sqrt2 + a + y,
    a + a / sqrt2 + x,
    size + y,
    a / sqrt2 + x,
    size + y,
    0 + x,
    a / sqrt2 + a + y,
    0 + x,
    a / sqrt2 + y,
  ];

  for (let i = 0; i < coords.length; i += 2) {
    const px = coords[i]!;
    const py = coords[i + 1]!;
    insertPoint(ctx, px, py);
  }
  for (let i = 0; i < coords.length; i += 2) {
    const ax = coords[i]!;
    const ay = coords[i + 1]!;
    const bx = coords[(i + 2) % coords.length]!;
    const by = coords[(i + 3) % coords.length]!;
    enforceEdge(ctx, ax, ay, bx, by);
  }
}
