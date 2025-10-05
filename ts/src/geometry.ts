import { CAPACITY, EPS, QUEUE_LIMIT, STACK_LIMIT } from "./constants";
import { orient2D, inTriangle, doCross, intersect, onSegment } from "./checks";
import type { Point } from "./types";
import { P } from "./types";
import { EdgeContext } from "./edgeContext";
import { StaticStack } from "./staticStack";
import { StaticQueue } from "./staticQueue";
import { StaticRing } from "./staticRing";
import { StaticDeque } from "./staticDeque";
import { isConvexQuad, isDelaunay, getVertex } from "./edges";

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
  Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;

const clonePoint = (p: Point): Point => ({ x: p.x, y: p.y });

export const locatePoint = (
  ctx: EdgeContext,
  p: Point,
  start: number,
): number | null => {
  let current = start;
  let i = 0;
  while (true) {
    assert(i < CAPACITY, "locatePoint exceeded iteration cap");
    i += 1;

    const a = ctx.origin(current);
    const bIdx = mustNext(ctx, current);
    const b = ctx.origin(bIdx);
    const cIdx = mustNext(ctx, bIdx);
    const c = ctx.origin(cIdx);

    if (inTriangle(p, a, b, c)) {
      return current;
    }

    let nextEdge = -1;
    const edges = [bIdx, cIdx];
    for (let k = 0; k < edges.length; k += 1) {
      const edgeIdx = edges[k];
      const edgeA = ctx.origin(edgeIdx);
      const nextIdx = mustNext(ctx, edgeIdx);
      const edgeB = ctx.origin(nextIdx);
      const orientation = orient2D(edgeA, edgeB, p);
      if (orientation < 0) {
        const twin = ctx.getTwin(edgeIdx);
        if (twin === -1) {
          return null;
        }
        nextEdge = twin;
        break;
      }
    }

    assert(nextEdge !== -1, "locatePoint failed to advance");
    current = nextEdge;
  }
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

export const findSharedEdge = (
  ctx: EdgeContext,
  edge: number,
  e1: Point,
  e2: Point,
): number => {
  const start = getVertex(ctx, e1, edge);
  assert(start !== -1, "findSharedEdge: e1 not a vertex");
  let current = start;
  const LIMIT = 100;
  let i = 0;

  while (i < LIMIT) {
    i += 1;
    const a = ctx.origin(current);
    const bIdx = mustNext(ctx, current);
    const b = ctx.origin(bIdx);
    if (pointsEqual(a, e1) && pointsEqual(b, e2)) {
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
    const a = ctx.origin(current);
    const bIdx = mustNext(ctx, current);
    const b = ctx.origin(bIdx);
    if (pointsEqual(a, e1) && pointsEqual(b, e2)) {
      return current;
    }
    const next = ctx.getTwin(mustNext(ctx, mustNext(ctx, current)));
    if (next === -1) break;
    current = next;
    if (current === start) break;
  }
  return -1;
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

const insertPointInEdge = (ctx: EdgeContext, p: Point, edge: number): void => {
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

  const stack = new GeometryStack();
  pushEdge(stack, cd);
  pushEdge(stack, da);

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

    pushEdge(stack, ab);
    pushEdge(stack, bc);
  }

  flipEdges(ctx, stack);
};

const insertPointInFace = (ctx: EdgeContext, p: Point, edge: number): void => {
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

  const stack = new GeometryStack();
  pushEdge(stack, ab);
  pushEdge(stack, bc);
  pushEdge(stack, ca);
  flipEdges(ctx, stack);
};

export const insertPoint = (ctx: EdgeContext, p: Point): void => {
  const start = ctx.any();
  const t = locatePoint(ctx, p, start);
  if (t === null) {
    throw new Error("Edge not found");
  }

  const tNext = mustNext(ctx, t);
  const tNextNext = mustNext(ctx, tNext);
  assert(mustNext(ctx, tNextNext) === t, "triangle connectivity broken");

  if (
    pointsEqual(ctx.origin(t), p) ||
    pointsEqual(ctx.origin(tNext), p) ||
    pointsEqual(ctx.origin(tNextNext), p)
  ) {
    return;
  }

  if (onSegment(p, ctx.origin(t), ctx.origin(tNext))) {
    insertPointInEdge(ctx, p, t);
  } else if (onSegment(p, ctx.origin(tNext), ctx.origin(tNextNext))) {
    insertPointInEdge(ctx, p, tNext);
  } else if (onSegment(p, ctx.origin(tNextNext), ctx.origin(t))) {
    insertPointInEdge(ctx, p, tNextNext);
  } else {
    insertPointInFace(ctx, p, t);
  }
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

const markCrossing = (
  ctx: EdgeContext,
  edge: number,
  e1: Point,
  e2: Point,
): void => {
  const LIMIT = 100;
  let current = edge;
  let i = 0;

  while (i < LIMIT) {
    i += 1;
    const [e0, e1Idx, e2Idx] = edgeLoopEdges(ctx, current);
    for (const candidate of [e0, e1Idx, e2Idx]) {
      const a = ctx.origin(candidate);
      const b = ctx.origin(mustNext(ctx, candidate));
      if (onSegment(a, e1, e2) && onSegment(b, e1, e2)) {
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
      const a = ctx.origin(candidate);
      const b = ctx.origin(mustNext(ctx, candidate));
      if (onSegment(a, e1, e2) && onSegment(b, e1, e2)) {
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

export const enforceEdge = (ctx: EdgeContext, e1: Point, e2: Point): void => {
  const queue = new GeometryQueue();
  const anyEdge = ctx.any();
  const p = locatePoint(ctx, e1, anyEdge);
  if (p === null) {
    throw new Error("EdgeNotFound");
  }

  const vertex = getVertex(ctx, e1, p);
  if (vertex !== -1) {
    const shared = findSharedEdge(ctx, p, e1, e2);
    if (shared !== -1) {
      ctx.setFixed(shared, true);
      const twinShared = ctx.getTwin(shared);
      if (twinShared !== -1) {
        ctx.setFixed(twinShared, true);
      }
      return;
    }
  }

  getIntersecting(ctx, queue, p, e1, e2);

  while (true) {
    const popped = queue.pop();
    if (popped === null) break;
    const edge = popped;

    if (ctx.isFixed(edge)) {
      const a = ctx.origin(edge);
      const b = ctx.origin(mustNext(ctx, edge));
      const intersection = intersect(e1, e2, a, b);
      assert(intersection !== null, "Expected intersection to exist");
      insertPointInEdge(ctx, intersection!, edge);
      const next = mustNext(ctx, edge);
      markCrossing(ctx, next, e1, e2);
      continue;
    }

    if (!isConvexQuad(ctx, edge)) {
      queue.push(edge);
      continue;
    }

    flip(ctx, edge);

    const origin = ctx.origin(edge);
    const dest = ctx.origin(mustNext(ctx, edge));
    if (onSegment(origin, e1, e2) && onSegment(dest, e1, e2)) {
      ctx.setFixed(edge, true);
      const twin = ctx.getTwin(edge);
      if (twin !== -1) {
        ctx.setFixed(twin, true);
      }
    }

    if (doCross(e1, e2, origin, dest)) {
      queue.push(edge);
    }
  }
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
  const toDestroy = new GeometryStack();

  while (i < LIMIT) {
    const next = mustNext(ctx, current);
    boundary.append(next);

    toDestroy.push(current);
    toDestroy.push(mustNext(ctx, next));

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

      toDestroy.push(current);
      toDestroy.push(mustNext(ctx, current));

      const nextTwin = ctx.getTwin(mustNext(ctx, current));
      if (nextTwin === -1) {
        boundary.prepend(mustNext(ctx, current));
        break;
      }
      current = nextTwin;
    }
  }

  while (true) {
    const edge = toDestroy.pop();
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
  const flipStack = new GeometryStack();
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
  const boundary = new GeometryRing();
  collectBoundary(ctx, boundary, p);
  removeCollinear(ctx, boundary);
  fillCavity(ctx, boundary);
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
