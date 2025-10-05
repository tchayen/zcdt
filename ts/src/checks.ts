import type { Point } from "./types";
import { EPS } from "./constants";

export const orient2D = (a: Point, b: Point, c: Point): number => {
  return orient2DCoords(a.x, a.y, b.x, b.y, c.x, c.y);
};

export const orient2DCoords = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): number => {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
};

export const inTriangle = (
  p: Point,
  e1: Point,
  e2: Point,
  e3: Point,
): boolean => {
  return inTriangleCoords(p.x, p.y, e1.x, e1.y, e2.x, e2.y, e3.x, e3.y);
};

export const inTriangleCoords = (
  px: number,
  py: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
  e3x: number,
  e3y: number,
): boolean => {
  return (
    orient2DCoords(e1x, e1y, e2x, e2y, px, py) > -EPS &&
    orient2DCoords(e2x, e2y, e3x, e3y, px, py) > -EPS &&
    orient2DCoords(e3x, e3y, e1x, e1y, px, py) > -EPS
  );
};

export const inCircle = (p: Point, t1: Point, t2: Point, t3: Point): number => {
  return inCircleCoords(p.x, p.y, t1.x, t1.y, t2.x, t2.y, t3.x, t3.y);
};

export const inCircleCoords = (
  px: number,
  py: number,
  t1x: number,
  t1y: number,
  t2x: number,
  t2y: number,
  t3x: number,
  t3y: number,
): number => {
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
};

export const doCross = (
  s1: Point,
  s2: Point,
  t1: Point,
  t2: Point,
): boolean => {
  return doCrossCoords(s1.x, s1.y, s2.x, s2.y, t1.x, t1.y, t2.x, t2.y);
};

export const doCrossCoords = (
  s1x: number,
  s1y: number,
  s2x: number,
  s2y: number,
  t1x: number,
  t1y: number,
  t2x: number,
  t2y: number,
): boolean => {
  const d1 = orient2DCoords(t1x, t1y, t2x, t2y, s1x, s1y);
  const d2 = orient2DCoords(t1x, t1y, t2x, t2y, s2x, s2y);
  const d3 = orient2DCoords(s1x, s1y, s2x, s2y, t1x, t1y);
  const d4 = orient2DCoords(s1x, s1y, s2x, s2y, t2x, t2y);
  return (
    (d1 > 0 && d2 < 0) ||
    (d1 < 0 && d2 > 0) ||
    (d3 > 0 && d4 < 0) ||
    (d3 < 0 && d4 > 0)
  );
};

export const intersect = (
  s1: Point,
  s2: Point,
  t1: Point,
  t2: Point,
): Point | null => {
  return intersectCoords(s1.x, s1.y, s2.x, s2.y, t1.x, t1.y, t2.x, t2.y);
};

export const intersectCoords = (
  s1x: number,
  s1y: number,
  s2x: number,
  s2y: number,
  t1x: number,
  t1y: number,
  t2x: number,
  t2y: number,
): Point | null => {
  if (!doCrossCoords(s1x, s1y, s2x, s2y, t1x, t1y, t2x, t2y)) return null;

  const a1 = s2y - s1y;
  const b1 = s1x - s2x;
  const c1 = a1 * s1x + b1 * s1y;
  const a2 = t2y - t1y;
  const b2 = t1x - t2x;
  const c2 = a2 * t1x + b2 * t1y;
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < EPS) return null;

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
    pointsEqualCoords(x, y, s1x, s1y) ||
    pointsEqualCoords(x, y, s2x, s2y) ||
    pointsEqualCoords(x, y, t1x, t1y) ||
    pointsEqualCoords(x, y, t2x, t2y)
  ) {
    return null;
  }

  return { x, y };
};

export const onSegment = (p: Point, s1: Point, s2: Point): boolean => {
  return onSegmentCoords(p.x, p.y, s1.x, s1.y, s2.x, s2.y);
};

export const onSegmentCoords = (
  px: number,
  py: number,
  s1x: number,
  s1y: number,
  s2x: number,
  s2y: number,
): boolean => {
  if (Math.abs(orient2DCoords(s1x, s1y, s2x, s2y, px, py)) > EPS) {
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
};

export const pointsEqualCoords = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean => Math.abs(ax - bx) < EPS && Math.abs(ay - by) < EPS;
