import { orient2D, inCircle } from "./checks";
import type { Point } from "./types";
import { EdgeContext } from "./edgeContext";

const pointsEqual = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;

export const isConvexQuad = (ctx: EdgeContext, edge: number): boolean => {
  const twin = ctx.getTwin(edge);
  if (twin === -1) {
    throw new Error("isConvexQuad requires an internal edge");
  }

  const a = ctx.origin(edge);
  const c = ctx.origin(ctx.getNext(edge));
  const d = ctx.origin(ctx.getNext(ctx.getNext(edge)));
  const b = ctx.origin(ctx.getNext(ctx.getNext(twin)));

  return (
    orient2D(a, b, c) > 0 &&
    orient2D(b, c, d) > 0 &&
    orient2D(c, d, a) > 0 &&
    orient2D(d, a, b) > 0
  );
};

export const isDelaunay = (ctx: EdgeContext, edge: number): boolean => {
  const twin = ctx.getTwin(edge);
  if (twin === -1) {
    throw new Error("isDelaunay requires a twin edge");
  }

  const t1 = ctx.origin(edge);
  const t2 = ctx.origin(ctx.getNext(edge));
  const t3 = ctx.origin(ctx.getNext(ctx.getNext(edge)));
  const d = ctx.origin(ctx.getNext(ctx.getNext(twin)));

  return inCircle(d, t1, t2, t3) < 0;
};

export const getVertex = (ctx: EdgeContext, p: Point, edge: number): number => {
  const a = ctx.origin(edge);
  if (pointsEqual(a, p)) return edge;
  const bIdx = ctx.getNext(edge);
  const b = ctx.origin(bIdx);
  if (pointsEqual(b, p)) return bIdx;
  const cIdx = ctx.getNext(bIdx);
  const c = ctx.origin(cIdx);
  if (pointsEqual(c, p)) return cIdx;
  return -1;
};

export const isEdgeEqual = (
  ctx: EdgeContext,
  edge: number,
  e1: Point,
  e2: Point,
): boolean => {
  const aIdx = edge;
  const bIdx = ctx.getNext(edge);
  const a = ctx.origin(aIdx);
  const b = ctx.origin(bIdx);
  return (
    (pointsEqual(a, e1) && pointsEqual(b, e2)) ||
    (pointsEqual(a, e2) && pointsEqual(b, e1))
  );
};
