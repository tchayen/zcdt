import type { Point } from "./types";
import { EPS } from "./constants";

export function orient2D(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

export function inTriangle(
  px: number,
  py: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
  e3x: number,
  e3y: number,
): boolean {
  return (
    orient2D(e1x, e1y, e2x, e2y, px, py) > -EPS &&
    orient2D(e2x, e2y, e3x, e3y, px, py) > -EPS &&
    orient2D(e3x, e3y, e1x, e1y, px, py) > -EPS
  );
}

export function inCircle(
  px: number,
  py: number,
  t1x: number,
  t1y: number,
  t2x: number,
  t2y: number,
  t3x: number,
  t3y: number,
): number {
  const ax = t1x - px;
  const ay = t1y - py;
  const bx = t2x - px;
  const by = t2y - py;
  const cx = t3x - px;
  const cy = t3y - py;
  const ab = ax * ax + ay * ay;
  const cd = cx * cx + cy * cy;
  const bc = bx * bx + by * by;
  return (
    ax * (by * cd - bc * cy) -
    ay * (bx * cd - bc * cx) +
    ab * (bx * cy - by * cx)
  );
}

export function doCross(
  s1x: number,
  s1y: number,
  s2x: number,
  s2y: number,
  t1x: number,
  t1y: number,
  t2x: number,
  t2y: number,
): boolean {
  const d1 = orient2D(t1x, t1y, t2x, t2y, s1x, s1y);
  const d2 = orient2D(t1x, t1y, t2x, t2y, s2x, s2y);
  const d3 = orient2D(s1x, s1y, s2x, s2y, t1x, t1y);
  const d4 = orient2D(s1x, s1y, s2x, s2y, t2x, t2y);
  return (
    (d1 > 0 && d2 < 0) ||
    (d1 < 0 && d2 > 0) ||
    (d3 > 0 && d4 < 0) ||
    (d3 < 0 && d4 > 0)
  );
}

export function intersect(
  s1x: number,
  s1y: number,
  s2x: number,
  s2y: number,
  t1x: number,
  t1y: number,
  t2x: number,
  t2y: number,
): Point | null {
  if (!doCross(s1x, s1y, s2x, s2y, t1x, t1y, t2x, t2y)) {
    return null;
  }

  const a1 = s2y - s1y;
  const b1 = s1x - s2x;
  const c1 = a1 * s1x + b1 * s1y;
  const a2 = t2y - t1y;
  const b2 = t1x - t2x;
  const c2 = a2 * t1x + b2 * t1y;
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < EPS) {
    return null;
  }

  const x = (b2 * c1 - b1 * c2) / det;
  const y = (a1 * c2 - a2 * c1) / det;

  if (
    x < Math.min(s1x, s2x) ||
    x > Math.max(s1x, s2x) ||
    y < Math.min(s1y, s2y) ||
    y > Math.max(s1y, s2y) ||
    x < Math.min(t1x, t2x) ||
    x > Math.max(t1x, t2x) ||
    y < Math.min(t1y, t2y) ||
    y > Math.max(t1y, t2y)
  ) {
    return null;
  }

  if (
    pointsEqual(x, y, s1x, s1y) ||
    pointsEqual(x, y, s2x, s2y) ||
    pointsEqual(x, y, t1x, t1y) ||
    pointsEqual(x, y, t2x, t2y)
  ) {
    return null;
  }

  return { x, y };
}

export function onSegment(
  px: number,
  py: number,
  s1x: number,
  s1y: number,
  s2x: number,
  s2y: number,
): boolean {
  if (Math.abs(orient2D(s1x, s1y, s2x, s2y, px, py)) > EPS) {
    return false;
  }

  if (
    px < Math.min(s1x, s2x) ||
    px > Math.max(s1x, s2x) ||
    py < Math.min(s1y, s2y) ||
    py > Math.max(s1y, s2y)
  ) {
    return false;
  }

  return true;
}

export function pointsEqual(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  return Math.abs(ax - bx) < EPS && Math.abs(ay - by) < EPS;
}
