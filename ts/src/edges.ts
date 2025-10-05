import { orient2D, inCircle, pointsEqual } from "./checks";
import type { Point } from "./types";
import { EdgeContext } from "./edgeContext";

export const isConvexQuad = (ctx: EdgeContext, edge: number): boolean => {
  const twin = ctx.getTwin(edge);
  if (twin === -1) {
    throw new Error("isConvexQuad requires an internal edge");
  }

  const ax = ctx.originXAt(edge);
  const ay = ctx.originYAt(edge);
  const cIdx = ctx.getNext(edge);
  const cx = ctx.originXAt(cIdx);
  const cy = ctx.originYAt(cIdx);
  const dIdx = ctx.getNext(cIdx);
  const dx = ctx.originXAt(dIdx);
  const dy = ctx.originYAt(dIdx);
  const bIdx = ctx.getNext(ctx.getNext(twin));
  const bx = ctx.originXAt(bIdx);
  const by = ctx.originYAt(bIdx);

  return (
    orient2D(ax, ay, bx, by, cx, cy) > 0 &&
    orient2D(bx, by, cx, cy, dx, dy) > 0 &&
    orient2D(cx, cy, dx, dy, ax, ay) > 0 &&
    orient2D(dx, dy, ax, ay, bx, by) > 0
  );
};

export const isDelaunay = (ctx: EdgeContext, edge: number): boolean => {
  const twin = ctx.getTwin(edge);
  if (twin === -1) {
    throw new Error("isDelaunay requires a twin edge");
  }

  const t1x = ctx.originXAt(edge);
  const t1y = ctx.originYAt(edge);
  const t2Idx = ctx.getNext(edge);
  const t2x = ctx.originXAt(t2Idx);
  const t2y = ctx.originYAt(t2Idx);
  const t3Idx = ctx.getNext(t2Idx);
  const t3x = ctx.originXAt(t3Idx);
  const t3y = ctx.originYAt(t3Idx);
  const dIdx = ctx.getNext(ctx.getNext(twin));
  const dx = ctx.originXAt(dIdx);
  const dy = ctx.originYAt(dIdx);

  return inCircle(dx, dy, t1x, t1y, t2x, t2y, t3x, t3y) < 0;
};

export const getVertex = (
  ctx: EdgeContext,
  px: number,
  py: number,
  edge: number,
): number => {
  const ax = ctx.originXAt(edge);
  const ay = ctx.originYAt(edge);
  if (pointsEqual(ax, ay, px, py)) return edge;
  const bIdx = ctx.getNext(edge);
  if (bIdx === -1) return -1;
  const bx = ctx.originXAt(bIdx);
  const by = ctx.originYAt(bIdx);
  if (pointsEqual(bx, by, px, py)) return bIdx;
  const cIdx = ctx.getNext(bIdx);
  if (cIdx === -1) return -1;
  const cx = ctx.originXAt(cIdx);
  const cy = ctx.originYAt(cIdx);
  if (pointsEqual(cx, cy, px, py)) return cIdx;
  return -1;
};

export const isEdgeEqual = (
  ctx: EdgeContext,
  edge: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
): boolean => {
  const aIdx = edge;
  const bIdx = ctx.getNext(edge);
  const ax = ctx.originXAt(aIdx);
  const ay = ctx.originYAt(aIdx);
  const bx = ctx.originXAt(bIdx);
  const by = ctx.originYAt(bIdx);
  return (
    (pointsEqual(ax, ay, e1x, e1y) && pointsEqual(bx, by, e2x, e2y)) ||
    (pointsEqual(ax, ay, e2x, e2y) && pointsEqual(bx, by, e1x, e1y))
  );
};

// Compatibility wrappers for Point-based API
export const getVertexPoint = (
  ctx: EdgeContext,
  p: Point,
  edge: number,
): number => {
  return getVertex(ctx, p.x, p.y, edge);
};

export const isEdgeEqualPoint = (
  ctx: EdgeContext,
  edge: number,
  e1: Point,
  e2: Point,
): boolean => {
  return isEdgeEqual(ctx, edge, e1.x, e1.y, e2.x, e2.y);
};
