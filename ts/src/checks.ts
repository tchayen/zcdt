import type { Point } from "./types";
import { EPS } from "./constants";

export const orient2D = (a: Point, b: Point, c: Point): number => {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
};

export const inTriangle = (
  p: Point,
  e1: Point,
  e2: Point,
  e3: Point,
): boolean => {
  return (
    orient2D(e1, e2, p) > -EPS &&
    orient2D(e2, e3, p) > -EPS &&
    orient2D(e3, e1, p) > -EPS
  );
};

export const inCircle = (p: Point, t1: Point, t2: Point, t3: Point): number => {
  const ax = t1.x - p.x;
  const ay = t1.y - p.y;
  const bx = t2.x - p.x;
  const by = t2.y - p.y;
  const cx = t3.x - p.x;
  const cy = t3.y - p.y;
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
  const d1 = orient2D(t1, t2, s1);
  const d2 = orient2D(t1, t2, s2);
  const d3 = orient2D(s1, s2, t1);
  const d4 = orient2D(s1, s2, t2);
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
  if (!doCross(s1, s2, t1, t2)) return null;

  const a1 = s2.y - s1.y;
  const b1 = s1.x - s2.x;
  const c1 = a1 * s1.x + b1 * s1.y;
  const a2 = t2.y - t1.y;
  const b2 = t1.x - t2.x;
  const c2 = a2 * t1.x + b2 * t1.y;
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < EPS) return null;

  const x = (b2 * c1 - b1 * c2) / det;
  const y = (a1 * c2 - a2 * c1) / det;

  if (
    x < Math.min(s1.x, s2.x) ||
    x > Math.max(s1.x, s2.x) ||
    y < Math.min(s1.y, s2.y) ||
    y > Math.max(s1.y, s2.y) ||
    x < Math.min(t1.x, t2.x) ||
    x > Math.max(t1.x, t2.x) ||
    y < Math.min(t1.y, t2.y) ||
    y > Math.max(t1.y, t2.y)
  ) {
    return null;
  }

  if (
    (Math.abs(x - s1.x) < EPS && Math.abs(y - s1.y) < EPS) ||
    (Math.abs(x - s2.x) < EPS && Math.abs(y - s2.y) < EPS) ||
    (Math.abs(x - t1.x) < EPS && Math.abs(y - t1.y) < EPS) ||
    (Math.abs(x - t2.x) < EPS && Math.abs(y - t2.y) < EPS)
  ) {
    return null;
  }

  return { x, y };
};

export const onSegment = (p: Point, s1: Point, s2: Point): boolean => {
  if (Math.abs(orient2D(s1, s2, p)) > EPS) {
    return false;
  }

  if (
    p.x < Math.min(s1.x, s2.x) ||
    p.x > Math.max(s1.x, s2.x) ||
    p.y < Math.min(s1.y, s2.y) ||
    p.y > Math.max(s1.y, s2.y)
  ) {
    return false;
  }

  return true;
};
