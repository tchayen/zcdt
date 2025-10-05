import { orient2D, inCircle, pointsEqual } from "./checks";
import type { Point } from "./types";
import { EdgeContext } from "./edgeContext";

export function isConvexQuad(ctx: EdgeContext, edge: number): boolean {
  const twin = ctx.twin[edge]!;
  if (twin === -1) {
    throw new Error("isConvexQuad requires an internal edge");
  }

  const ax = ctx.originX[edge]!;
  const ay = ctx.originY[edge]!;
  const cIdx = ctx.next[edge]!;
  const cx = ctx.originX[cIdx]!;
  const cy = ctx.originY[cIdx]!;
  const dIdx = ctx.next[cIdx]!;
  const dx = ctx.originX[dIdx]!;
  const dy = ctx.originY[dIdx]!;
  const bIdx = ctx.next[ctx.next[twin]!]!;
  const bx = ctx.originX[bIdx]!;
  const by = ctx.originY[bIdx]!;

  return (
    orient2D(ax, ay, bx, by, cx, cy) > 0 &&
    orient2D(bx, by, cx, cy, dx, dy) > 0 &&
    orient2D(cx, cy, dx, dy, ax, ay) > 0 &&
    orient2D(dx, dy, ax, ay, bx, by) > 0
  );
}

export function isDelaunay(ctx: EdgeContext, edge: number): boolean {
  const twin = ctx.twin[edge]!;
  if (twin === -1) {
    throw new Error("isDelaunay requires a twin edge");
  }

  const t1x = ctx.originX[edge]!;
  const t1y = ctx.originY[edge]!;
  const t2Idx = ctx.next[edge]!;
  const t2x = ctx.originX[t2Idx]!;
  const t2y = ctx.originY[t2Idx]!;
  const t3Idx = ctx.next[t2Idx]!;
  const t3x = ctx.originX[t3Idx]!;
  const t3y = ctx.originY[t3Idx]!;
  const dIdx = ctx.next[ctx.next[twin]!]!;
  const dx = ctx.originX[dIdx]!;
  const dy = ctx.originY[dIdx]!;

  return inCircle(dx, dy, t1x, t1y, t2x, t2y, t3x, t3y) < 0;
}

export function getVertex(
  ctx: EdgeContext,
  px: number,
  py: number,
  edge: number,
): number {
  const ax = ctx.originX[edge]!;
  const ay = ctx.originY[edge]!;
  if (pointsEqual(ax, ay, px, py)) {
    return edge;
  }
  const bIdx = ctx.next[edge]!;
  if (bIdx === -1) {
    return -1;
  }
  const bx = ctx.originX[bIdx]!;
  const by = ctx.originY[bIdx]!;
  if (pointsEqual(bx, by, px, py)) {
    return bIdx;
  }
  const cIdx = ctx.next[bIdx]!;
  if (cIdx === -1) {
    return -1;
  }
  const cx = ctx.originX[cIdx]!;
  const cy = ctx.originY[cIdx]!;
  if (pointsEqual(cx, cy, px, py)) {
    return cIdx;
  }
  return -1;
}
