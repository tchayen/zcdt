import type { Point } from "./types";
import { P } from "./types";
import { insertPoint, enforceEdge } from "./geometry";
import { EdgeContext } from "./edgeContext";

export const insertSquare = (
  ctx: EdgeContext,
  x: number,
  y: number,
  size: number,
): void => {
  const points = [
    P(x, y),
    P(x + size, y),
    P(x + size, y + size),
    P(x, y + size),
  ];

  for (const p of points) {
    insertPoint(ctx, p);
  }

  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    enforceEdge(ctx, a, b);
  }
};

export const insertPolygon = (ctx: EdgeContext, points: Point[]): void => {
  for (const point of points) {
    insertPoint(ctx, point);
  }
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    enforceEdge(ctx, a, b);
  }
};

export const insertOctagon = (
  ctx: EdgeContext,
  x: number,
  y: number,
  size: number,
): void => {
  const sqrt2 = Math.sqrt(2);
  const a = size / (sqrt2 + 1);
  const local: Point[] = [
    P(a / sqrt2, 0),
    P(a + a / sqrt2, 0),
    P(size, a / sqrt2),
    P(size, a / sqrt2 + a),
    P(a + a / sqrt2, size),
    P(a / sqrt2, size),
    P(0, a / sqrt2 + a),
    P(0, a / sqrt2),
  ];

  const points = local.map((p) => P(p.x + x, p.y + y));
  insertPolygon(ctx, points);
};
