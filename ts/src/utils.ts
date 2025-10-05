import type { Point } from "./types";
import { P } from "./types";
import { insertPointCoords, enforceEdgeCoords } from "./geometry";
import { EdgeContext } from "./edgeContext";

export const insertSquare = (
  ctx: EdgeContext,
  x: number,
  y: number,
  size: number,
): void => {
  const coords = [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
  ];

  for (const [px, py] of coords) {
    insertPointCoords(ctx, px, py);
  }

  for (let i = 0; i < coords.length; i += 1) {
    const [ax, ay] = coords[i]!;
    const [bx, by] = coords[(i + 1) % coords.length]!;
    enforceEdgeCoords(ctx, ax, ay, bx, by);
  }
};

export const insertPolygon = (ctx: EdgeContext, points: Point[]): void => {
  for (const point of points) {
    insertPointCoords(ctx, point.x, point.y);
  }
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    enforceEdgeCoords(ctx, a.x, a.y, b.x, b.y);
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
  const coords = [
    [a / sqrt2 + x, 0 + y],
    [a + a / sqrt2 + x, 0 + y],
    [size + x, a / sqrt2 + y],
    [size + x, a / sqrt2 + a + y],
    [a + a / sqrt2 + x, size + y],
    [a / sqrt2 + x, size + y],
    [0 + x, a / sqrt2 + a + y],
    [0 + x, a / sqrt2 + y],
  ];

  for (const [px, py] of coords) {
    insertPointCoords(ctx, px, py);
  }
  for (let i = 0; i < coords.length; i += 1) {
    const [ax, ay] = coords[i]!;
    const [bx, by] = coords[(i + 1) % coords.length]!;
    enforceEdgeCoords(ctx, ax, ay, bx, by);
  }
};
