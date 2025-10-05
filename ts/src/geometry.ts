import { nullthrows as nt } from "./nullthrows";
import { CAPACITY, EPS, QUEUE_LIMIT, STACK_LIMIT } from "./constants";
import {
  orient2D,
  orient2DCoords,
  inTriangle,
  inTriangleCoords,
  doCross,
  doCrossCoords,
  intersect,
  intersectCoords,
  onSegment,
  onSegmentCoords,
  pointsEqualCoords,
} from "./checks";
import type { Point } from "./types";
import { P } from "./types";
import { EdgeContext } from "./edgeContext";
import { StaticStack } from "./staticStack";
import { StaticQueue } from "./staticQueue";
import { StaticRing } from "./staticRing";
import { StaticDeque } from "./staticDeque";
import { isConvexQuad, isDelaunay, getVertex, getVertexCoords } from "./edges";

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const mustNext = (ctx: EdgeContext, edge: number): number => {
  const next = ctx.getNext(edge);
  if (next === -1) {
    throw new Error("Half-edge has no `next` reference");
  }
  return next;
};

const mustTwin = (ctx: EdgeContext, edge: number): number => {
  const twin = ctx.getTwin(edge);
  if (twin === -1) {
    throw new Error("Half-edge has no twin");
  }
  return twin;
};

const pointsEqual = (a: Point, b: Point): boolean =>
  pointsEqualCoords(a.x, a.y, b.x, b.y);

const clonePoint = (p: Point): Point => ({ x: p.x, y: p.y });

export const locatePointCoords = (
  ctx: EdgeContext,
  px: number,
  py: number,
  start: number,
): number | null => {
  let current = start;
  let i = 0;
  while (i < 10000) {
    i += 1;

    // Get triangle vertices directly without Point object allocation
    const ax = ctx.originXAt(current);
    const ay = ctx.originYAt(current);

    const bIdx = ctx.getNext(current);
    if (bIdx === -1) throw new Error("Half-edge has no `next` reference");
    const bx = ctx.originXAt(bIdx);
    const by = ctx.originYAt(bIdx);

    const cIdx = ctx.getNext(bIdx);
    if (cIdx === -1) throw new Error("Half-edge has no `next` reference");
    const cx = ctx.originXAt(cIdx);
    const cy = ctx.originYAt(cIdx);

    // Fast triangle containment test
    if (inTriangleCoords(px, py, ax, ay, bx, by, cx, cy)) {
      return current;
    }

    let nextEdge = -1;

    // Check edge bIdx
    const orientB = orient2DCoords(bx, by, cx, cy, px, py);
    if (orientB < 0) {
      const twin = ctx.getTwin(bIdx);
      if (twin === -1) return null;
      nextEdge = twin;
    } else {
      // Check edge cIdx
      const orientC = orient2DCoords(cx, cy, ax, ay, px, py);
      if (orientC < 0) {
        const twin = ctx.getTwin(cIdx);
        if (twin === -1) return null;
        nextEdge = twin;
      }
    }

    if (nextEdge === -1) {
      throw new Error("locatePoint failed to advance");
    }

    current = nextEdge;
  }

  throw new Error("locatePoint exceeded iteration cap");
};

export const locatePoint = (
  ctx: EdgeContext,
  p: Point,
  start: number,
): number | null => {
  return locatePointCoords(ctx, p.x, p.y, start);
};

export const square = (
  ctx: EdgeContext,
  width: number,
  height: number,
): void => {
  const a = P(0, 0);
  const b = P(width, 0);
  const c = P(width, height);
  const d = P(0, height);

  const ab = ctx.create({ origin: a });
  const bc = ctx.create({ origin: b });
  const ca = ctx.create({ origin: c });
  ctx.setNext(ab, bc);
  ctx.setNext(bc, ca);
  ctx.setNext(ca, ab);

  const cd = ctx.create({ origin: c });
  const da = ctx.create({ origin: d });
  const ac = ctx.create({ origin: a });
  ctx.setNext(cd, da);
  ctx.setNext(da, ac);
  ctx.setNext(ac, cd);

  ctx.setTwin(ac, ca);
  ctx.setTwin(ca, ac);
};

export const flip = (ctx: EdgeContext, edge: number): void => {
  const twin = mustTwin(ctx, edge);
  assert(!ctx.isFixed(edge) && !ctx.isFixed(twin), "cannot flip fixed edge");
  assert(isConvexQuad(ctx, edge), "flip requires convex quad");

  const ac = edge;
  const ca = twin;
  const ab = mustNext(ctx, ca);
  const bc = mustNext(ctx, ab);
  const cd = mustNext(ctx, ac);
  const da = mustNext(ctx, cd);

  ctx.setOrigin(ac, ctx.origin(da));
  ctx.setOrigin(ca, ctx.origin(bc));

  ctx.setNext(ac, bc);
  ctx.setNext(cd, ac);
  ctx.setNext(bc, cd);

  ctx.setNext(ca, da);
  ctx.setNext(ab, ca);
  ctx.setNext(da, ab);
};

export const flipEdges = (ctx: EdgeContext, stack: StaticStack): void => {
  while (true) {
    const e = stack.pop();
    if (e === null) break;
    const edge = e;
    const twin = ctx.getTwin(edge);
    if (twin === -1) continue;
    if (ctx.isFixed(edge) || ctx.isFixed(twin)) continue;
    if (isDelaunay(ctx, edge)) continue;

    const fNext = mustNext(ctx, twin);
    const fNextNext = mustNext(ctx, fNext);
    stack.push(fNext);
    stack.push(fNextNext);
    flip(ctx, edge);
  }
};

export const findSharedEdgeCoords = (
  ctx: EdgeContext,
  edge: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
): number => {
  const start = getVertexCoords(ctx, e1x, e1y, edge);
  assert(start !== -1, "findSharedEdge: e1 not a vertex");
  let current = start;
  const LIMIT = 100;
  let i = 0;

  while (i < LIMIT) {
    i += 1;
    const ax = ctx.originXAt(current);
    const ay = ctx.originYAt(current);
    const bIdx = mustNext(ctx, current);
    const bx = ctx.originXAt(bIdx);
    const by = ctx.originYAt(bIdx);
    if (
      pointsEqualCoords(ax, ay, e1x, e1y) &&
      pointsEqualCoords(bx, by, e2x, e2y)
    ) {
      return current;
    }
    const twin = ctx.getTwin(current);
    if (twin === -1) break;
    current = mustNext(ctx, twin);
    if (current === start) break;
  }

  current = start;
  while (i < LIMIT) {
    i += 1;
    const ax = ctx.originXAt(current);
    const ay = ctx.originYAt(current);
    const bIdx = mustNext(ctx, current);
    const bx = ctx.originXAt(bIdx);
    const by = ctx.originYAt(bIdx);
    if (
      pointsEqualCoords(ax, ay, e1x, e1y) &&
      pointsEqualCoords(bx, by, e2x, e2y)
    ) {
      return current;
    }
    const next = ctx.getTwin(mustNext(ctx, mustNext(ctx, current)));
    if (next === -1) break;
    current = next;
    if (current === start) break;
  }
  return -1;
};

export const findSharedEdge = (
  ctx: EdgeContext,
  edge: number,
  e1: Point,
  e2: Point,
): number => {
  return findSharedEdgeCoords(ctx, edge, e1.x, e1.y, e2.x, e2.y);
};

const pushEdge = (stack: StaticStack, edge: number): void => {
  stack.push(edge);
};

const createEdge = (ctx: EdgeContext, origin: Point, fixed = false): number => {
  return ctx.create({ origin, fixed });
};

const setTwinPair = (ctx: EdgeContext, a: number, b: number): void => {
  ctx.setTwin(a, b);
  ctx.setTwin(b, a);
};

const insertPointInEdgeCoords = (ctx: EdgeContext, px: number, py: number, edge: number): void => {
  const p = P(px, py);
  const ac = edge;
  const cd = mustNext(ctx, ac);
  const da = mustNext(ctx, cd);

  const pd = createEdge(ctx, p);
  const dp = createEdge(ctx, ctx.origin(da));
  setTwinPair(ctx, pd, dp);

  ctx.setNext(ac, pd);
  ctx.setNext(pd, da);

  const pc = createEdge(ctx, p, ctx.isFixed(ac));
  ctx.setNext(pc, cd);
  ctx.setNext(dp, pc);
  ctx.setNext(cd, dp);

  insertStack.reset();
  pushEdge(insertStack, cd);
  pushEdge(insertStack, da);

  const pa = ctx.getTwin(ac);
  if (pa !== -1) {
    ctx.setOrigin(pa, clonePoint(p));
    const ab = mustNext(ctx, pa);

    const cp = createEdge(ctx, ctx.origin(cd), ctx.isFixed(pa));
    setTwinPair(ctx, pc, cp);

    const bc = mustNext(ctx, ab);
    const pb = createEdge(ctx, p);
    const bp = createEdge(ctx, ctx.origin(bc));
    setTwinPair(ctx, pb, bp);

    ctx.setNext(ab, bp);
    ctx.setNext(bp, pa);

    ctx.setNext(cp, pb);
    ctx.setNext(pb, bc);
    ctx.setNext(bc, cp);

    pushEdge(insertStack, ab);
    pushEdge(insertStack, bc);
  }

  flipEdges(ctx, insertStack);
};

const insertPointInFaceCoords = (ctx: EdgeContext, px: number, py: number, edge: number): void => {
  const p = P(px, py);
  const ab = edge;
  const bc = mustNext(ctx, ab);
  const ca = mustNext(ctx, bc);

  const a = ctx.origin(ab);
  const b = ctx.origin(bc);
  const c = ctx.origin(ca);

  const pa = createEdge(ctx, p);
  const ap = createEdge(ctx, a);
  setTwinPair(ctx, pa, ap);
  ctx.setNext(pa, ab);

  const pb = createEdge(ctx, p);
  const bp = createEdge(ctx, b);
  setTwinPair(ctx, pb, bp);
  ctx.setNext(pb, bc);

  const pc = createEdge(ctx, p);
  const cp = createEdge(ctx, c);
  setTwinPair(ctx, pc, cp);
  ctx.setNext(pc, ca);

  ctx.setNext(ap, pc);
  ctx.setNext(bp, pa);
  ctx.setNext(cp, pb);

  ctx.setNext(ab, bp);
  ctx.setNext(bc, cp);
  ctx.setNext(ca, ap);

  insertStack.reset();
  pushEdge(insertStack, ab);
  pushEdge(insertStack, bc);
  pushEdge(insertStack, ca);
  flipEdges(ctx, insertStack);
};

export const insertPointCoords = (ctx: EdgeContext, px: number, py: number): void => {
  const start = ctx.any();
  const t = locatePointCoords(ctx, px, py, start);
  if (t === null) {
    throw new Error("Edge not found");
  }

  const tNext = mustNext(ctx, t);
  const tNextNext = mustNext(ctx, tNext);
  assert(mustNext(ctx, tNextNext) === t, "triangle connectivity broken");

  const tx = ctx.originXAt(t);
  const ty = ctx.originYAt(t);
  const tNextX = ctx.originXAt(tNext);
  const tNextY = ctx.originYAt(tNext);
  const tNextNextX = ctx.originXAt(tNextNext);
  const tNextNextY = ctx.originYAt(tNextNext);

  if (
    pointsEqualCoords(tx, ty, px, py) ||
    pointsEqualCoords(tNextX, tNextY, px, py) ||
    pointsEqualCoords(tNextNextX, tNextNextY, px, py)
  ) {
    return;
  }

  if (onSegmentCoords(px, py, tx, ty, tNextX, tNextY)) {
    insertPointInEdgeCoords(ctx, px, py, t);
  } else if (
    onSegmentCoords(px, py, tNextX, tNextY, tNextNextX, tNextNextY)
  ) {
    insertPointInEdgeCoords(ctx, px, py, tNext);
  } else if (onSegmentCoords(px, py, tNextNextX, tNextNextY, tx, ty)) {
    insertPointInEdgeCoords(ctx, px, py, tNextNext);
  } else {
    insertPointInFaceCoords(ctx, px, py, t);
  }
};

export const insertPoint = (ctx: EdgeContext, p: Point): void => {
  insertPointCoords(ctx, p.x, p.y);
};

export class GeometryQueue extends StaticQueue {
  constructor() {
    super(QUEUE_LIMIT);
  }
}

export class GeometryStack extends StaticStack {
  constructor() {
    super(STACK_LIMIT);
  }
}

export class GeometryRing extends StaticRing {
  constructor() {
    super(QUEUE_LIMIT);
  }
}

export class GeometryDeque extends StaticDeque {
  constructor() {
    super(QUEUE_LIMIT);
  }
}

// Reusable static instances to avoid allocation overhead
const flipStack = new GeometryStack();
const intersectQueue = new GeometryQueue();
const boundaryRing = new GeometryRing();
const insertStack = new GeometryStack();
const destroyStack = new GeometryStack();

const edgeLoopEdges = (
  ctx: EdgeContext,
  edge: number,
): [number, number, number] => {
  const b = mustNext(ctx, edge);
  const c = mustNext(ctx, b);
  return [edge, b, c];
};

const hasIntersection = (
  ctx: EdgeContext,
  edge: number,
  e1: Point,
  e2: Point,
): boolean => {
  const a = ctx.origin(edge);
  const b = ctx.origin(mustNext(ctx, edge));
  return intersect(a, b, e1, e2) !== null;
};

const setNextSafe = (ctx: EdgeContext, edge: number, next: number): void => {
  ctx.setNext(edge, next);
};

export const getIntersecting = (
  ctx: EdgeContext,
  queue: GeometryQueue,
  seed: number,
  e1: Point,
  e2: Point,
): void => {
  queue.reset();
  const inTriangleEdge = locatePoint(ctx, e1, seed);
  if (inTriangleEdge === null) {
    throw new Error("E1NotInAnyTriangle");
  }

  const LIMIT = 20;
  const startEdge = (() => {
    const start = getVertex(ctx, e1, inTriangleEdge);
    if (start === -1) {
      throw new Error("E1NotAVertex");
    }

    let current = start;
    let i = 0;
    while (i < LIMIT) {
      const [eA, eB, eC] = edgeLoopEdges(ctx, current);
      if (
        hasIntersection(ctx, eA, e1, e2) ||
        hasIntersection(ctx, eB, e1, e2) ||
        hasIntersection(ctx, eC, e1, e2)
      ) {
        return current;
      }

      const twin = ctx.getTwin(current);
      if (twin === -1) break;
      current = mustNext(ctx, twin);
      if (current === start) break;
      i += 1;
    }

    current = start;
    while (i < LIMIT) {
      const [eA, eB, eC] = edgeLoopEdges(ctx, current);
      if (
        hasIntersection(ctx, eA, e1, e2) ||
        hasIntersection(ctx, eB, e1, e2) ||
        hasIntersection(ctx, eC, e1, e2)
      ) {
        return current;
      }

      const next = ctx.getTwin(mustNext(ctx, mustNext(ctx, current)));
      if (next === -1) break;
      current = next;
      if (current === start) break;
      i += 1;
    }

    return -1;
  })();

  if (startEdge === -1) {
    throw new Error("NoSuitableStartEdge");
  }

  let current = startEdge;
  let iterations = 0;
  while (iterations < LIMIT) {
    iterations += 1;
    const first = mustNext(ctx, current);
    const second = mustNext(ctx, first);

    for (const edge of [first, second]) {
      const a = ctx.origin(edge);
      const b = ctx.origin(mustNext(ctx, edge));
      const intersection = intersect(a, b, e1, e2);
      if (intersection !== null) {
        const twin = ctx.getTwin(edge);
        assert(twin !== -1, "intersecting edge should have a twin");
        queue.push(edge);
        current = twin;
      }
    }
  }
};

const markCrossingCoords = (
  ctx: EdgeContext,
  edge: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
): void => {
  const LIMIT = 100;
  let current = edge;
  let i = 0;

  while (i < LIMIT) {
    i += 1;
    const [e0, e1Idx, e2Idx] = edgeLoopEdges(ctx, current);
    for (const candidate of [e0, e1Idx, e2Idx]) {
      const ax = ctx.originXAt(candidate);
      const ay = ctx.originYAt(candidate);
      const bIdx = mustNext(ctx, candidate);
      const bx = ctx.originXAt(bIdx);
      const by = ctx.originYAt(bIdx);
      if (onSegmentCoords(ax, ay, e1x, e1y, e2x, e2y) && onSegmentCoords(bx, by, e1x, e1y, e2x, e2y)) {
        ctx.setFixed(candidate, true);
        const twin = ctx.getTwin(candidate);
        if (twin !== -1) {
          ctx.setFixed(twin, true);
        }
      }
    }

    const twin = ctx.getTwin(current);
    if (twin === -1) break;
    current = mustNext(ctx, twin);
    if (current === edge) break;
  }

  current = edge;
  i = 0;
  while (i < LIMIT) {
    i += 1;
    const [e0, e1Idx, e2Idx] = edgeLoopEdges(ctx, current);
    for (const candidate of [e0, e1Idx, e2Idx]) {
      const ax = ctx.originXAt(candidate);
      const ay = ctx.originYAt(candidate);
      const bIdx = mustNext(ctx, candidate);
      const bx = ctx.originXAt(bIdx);
      const by = ctx.originYAt(bIdx);
      if (onSegmentCoords(ax, ay, e1x, e1y, e2x, e2y) && onSegmentCoords(bx, by, e1x, e1y, e2x, e2y)) {
        ctx.setFixed(candidate, true);
        const twin = ctx.getTwin(candidate);
        if (twin !== -1) {
          ctx.setFixed(twin, true);
        }
      }
    }

    const next = ctx.getTwin(mustNext(ctx, mustNext(ctx, current)));
    if (next === -1) break;
    current = next;
    if (current === edge) break;
  }
};

const markCrossing = (
  ctx: EdgeContext,
  edge: number,
  e1: Point,
  e2: Point,
): void => {
  markCrossingCoords(ctx, edge, e1.x, e1.y, e2.x, e2.y);
};

export const enforceEdgeCoords = (ctx: EdgeContext, e1x: number, e1y: number, e2x: number, e2y: number): void => {
  intersectQueue.reset();
  const anyEdge = ctx.any();
  const p = locatePointCoords(ctx, e1x, e1y, anyEdge);
  if (p === null) {
    throw new Error("EdgeNotFound");
  }

  const vertex = getVertexCoords(ctx, e1x, e1y, p);
  if (vertex !== -1) {
    const shared = findSharedEdgeCoords(ctx, p, e1x, e1y, e2x, e2y);
    if (shared !== -1) {
      ctx.setFixed(shared, true);
      const twinShared = ctx.getTwin(shared);
      if (twinShared !== -1) {
        ctx.setFixed(twinShared, true);
      }
      return;
    }
  }

  const e1Point = P(e1x, e1y);
  const e2Point = P(e2x, e2y);
  getIntersecting(ctx, intersectQueue, p, e1Point, e2Point);

  while (true) {
    const popped = intersectQueue.pop();
    if (popped === null) break;
    const edge = popped;

    if (ctx.isFixed(edge)) {
      const ax = ctx.originXAt(edge);
      const ay = ctx.originYAt(edge);
      const bIdx = mustNext(ctx, edge);
      const bx = ctx.originXAt(bIdx);
      const by = ctx.originYAt(bIdx);
      const intersection = intersectCoords(e1x, e1y, e2x, e2y, ax, ay, bx, by);
      assert(intersection !== null, "Expected intersection to exist");
      insertPointInEdgeCoords(ctx, intersection!.x, intersection!.y, edge);
      const next = mustNext(ctx, edge);
      markCrossingCoords(ctx, next, e1x, e1y, e2x, e2y);
      continue;
    }

    if (!isConvexQuad(ctx, edge)) {
      intersectQueue.push(edge);
      continue;
    }

    flip(ctx, edge);

    const originX = ctx.originXAt(edge);
    const originY = ctx.originYAt(edge);
    const destIdx = mustNext(ctx, edge);
    const destX = ctx.originXAt(destIdx);
    const destY = ctx.originYAt(destIdx);
    if (onSegmentCoords(originX, originY, e1x, e1y, e2x, e2y) && onSegmentCoords(destX, destY, e1x, e1y, e2x, e2y)) {
      ctx.setFixed(edge, true);
      const twin = ctx.getTwin(edge);
      if (twin !== -1) {
        ctx.setFixed(twin, true);
      }
    }

    if (doCrossCoords(e1x, e1y, e2x, e2y, originX, originY, destX, destY)) {
      intersectQueue.push(edge);
    }
  }
};

export const enforceEdge = (ctx: EdgeContext, e1: Point, e2: Point): void => {
  enforceEdgeCoords(ctx, e1.x, e1.y, e2.x, e2.y);
};

const isBoundaryEdge = (ctx: EdgeContext, edge: number): boolean =>
  ctx.getTwin(edge) === -1;

const ringContains = (ring: GeometryRing, edge: number): boolean => {
  const first = ring.first;
  if (first === -1) return false;
  let node = first;
  do {
    if (ring.valueOf(node) === edge) return true;
    node = ring.nextOf(node);
  } while (node !== first);
  return false;
};

const destroyEdgeIfInternal = (
  ctx: EdgeContext,
  edge: number,
  boundary: GeometryRing,
): void => {
  if (!isBoundaryEdge(ctx, edge) && !ringContains(boundary, edge)) {
    ctx.destroy(edge);
  }
};

export const collectBoundary = (
  ctx: EdgeContext,
  boundary: GeometryRing,
  p: Point,
): void => {
  boundary.reset();
  const anyEdge = ctx.any();
  const startTriangle = locatePoint(ctx, p, anyEdge);
  if (startTriangle === null) {
    throw new Error("EdgeNotFound");
  }

  const startVertex = getVertex(ctx, p, startTriangle);
  if (startVertex === -1) {
    throw new Error("NotVertex");
  }

  let current = startVertex;
  const LIMIT = 128;
  let i = 0;
  let continueCW = false;
  destroyStack.reset();

  while (i < LIMIT) {
    const next = mustNext(ctx, current);
    boundary.append(next);

    destroyStack.push(current);
    destroyStack.push(mustNext(ctx, next));

    const twin = ctx.getTwin(mustNext(ctx, next));
    if (twin === -1) {
      boundary.append(mustNext(ctx, next));
      continueCW = true;
      break;
    }

    current = twin;
    if (current === startVertex) break;
    i += 1;
  }

  if (continueCW) {
    if (ctx.getTwin(startVertex) === -1) {
      boundary.prepend(startVertex);
    }

    current = ctx.getTwin(startVertex);
    while (current !== -1) {
      i += 1;
      assert(i < LIMIT, "collectBoundary exceeded iteration cap (cw)");
      const next = mustNext(ctx, mustNext(ctx, current));
      boundary.prepend(next);

      destroyStack.push(current);
      destroyStack.push(mustNext(ctx, current));

      const nextTwin = ctx.getTwin(mustNext(ctx, current));
      if (nextTwin === -1) {
        boundary.prepend(mustNext(ctx, current));
        break;
      }
      current = nextTwin;
    }
  }

  while (true) {
    const edge = destroyStack.pop();
    if (edge === null) break;
    destroyEdgeIfInternal(ctx, edge, boundary);
  }
};

export const removeCollinear = (
  ctx: EdgeContext,
  boundary: GeometryRing,
): void => {
  let aNode = boundary.first;
  if (aNode === -1) return;
  let bNode = boundary.nextOf(aNode);
  let cNode = boundary.nextOf(bNode);

  while (true) {
    const aEdge = boundary.valueOf(aNode);
    const bEdge = boundary.valueOf(bNode);
    const cEdge = boundary.valueOf(cNode);

    const isOnBoundary =
      isBoundaryEdge(ctx, aEdge) && isBoundaryEdge(ctx, bEdge);
    const collinear =
      Math.abs(
        orient2D(ctx.origin(aEdge), ctx.origin(bEdge), ctx.origin(cEdge)),
      ) <= EPS;

    if (isOnBoundary && collinear) {
      ctx.destroy(bEdge);
      setNextSafe(ctx, aEdge, cEdge);
      boundary.remove(bNode);
      if (boundary.length() < 3) break;
      bNode = boundary.nextOf(aNode);
      cNode = boundary.nextOf(bNode);
      continue;
    }

    aNode = boundary.nextOf(aNode);
    bNode = boundary.nextOf(aNode);
    cNode = boundary.nextOf(bNode);
    if (aNode === boundary.first) break;
  }
};

export const fillCavity = (ctx: EdgeContext, boundary: GeometryRing): void => {
  assert(
    boundary.length() >= 3,
    "fillCavity expects at least three boundary edges",
  );
  flipStack.reset();
  let current = boundary.first;

  while (boundary.length() > 3 && current !== -1) {
    const aNode = current;
    const bNode = boundary.nextOf(aNode);
    const cNode = boundary.nextOf(bNode);

    const aEdge = boundary.valueOf(aNode);
    const bEdge = boundary.valueOf(bNode);
    const cEdge = boundary.valueOf(cNode);

    const aPoint = ctx.origin(aEdge);
    const bPoint = ctx.origin(bEdge);
    const cPoint = ctx.origin(cEdge);

    const isEar = (() => {
      if (orient2D(aPoint, bPoint, cPoint) <= 0) return false;

      let other = boundary.first;
      if (other === -1) return true;
      do {
        if (other !== aNode && other !== bNode && other !== cNode) {
          const p = ctx.origin(boundary.valueOf(other));
          if (inTriangle(p, aPoint, bPoint, cPoint)) return false;
        }
        other = boundary.nextOf(other);
      } while (other !== boundary.first);

      return true;
    })();

    if (isEar) {
      const ca = createEdge(ctx, cPoint);
      const ac = createEdge(ctx, aPoint);
      setTwinPair(ctx, ca, ac);

      setNextSafe(ctx, aEdge, bEdge);
      setNextSafe(ctx, bEdge, ca);
      setNextSafe(ctx, ca, aEdge);

      flipStack.push(aEdge);
      flipStack.push(bEdge);

      current = boundary.insertAfter(bNode, ac);
      boundary.remove(aNode);
      boundary.remove(bNode);
    } else {
      current = boundary.nextOf(current);
    }
  }

  const first = boundary.first;
  if (first !== -1) {
    const second = boundary.nextOf(first);
    const third = boundary.nextOf(second);
    const aEdge = boundary.valueOf(first);
    const bEdge = boundary.valueOf(second);
    const cEdge = boundary.valueOf(third);
    setNextSafe(ctx, aEdge, bEdge);
    setNextSafe(ctx, bEdge, cEdge);
    setNextSafe(ctx, cEdge, aEdge);
  }

  flipEdges(ctx, flipStack);
};

export const removePoint = (ctx: EdgeContext, p: Point): void => {
  boundaryRing.reset();
  collectBoundary(ctx, boundaryRing, p);
  removeCollinear(ctx, boundaryRing);
  fillCavity(ctx, boundaryRing);
};

export const validate = (ctx: EdgeContext): void => {
  for (const edge of ctx.iterator()) {
    const next1 = ctx.getNext(edge);
    const next2 = next1 === -1 ? -1 : ctx.getNext(next1);
    const next3 = next2 === -1 ? -1 : ctx.getNext(next2);
    if (next3 !== edge) {
      throw new Error("Edge does not form triangle");
    }
    const twin = ctx.getTwin(edge);
    if (twin !== -1 && ctx.getTwin(twin) !== edge) {
      throw new Error("Twin mismatch");
    }
    if (twin !== -1 && ctx.isFixed(edge) && !ctx.isFixed(twin)) {
      throw new Error("Fixed edge mismatch");
    }
  }
};
