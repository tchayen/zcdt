import { nullthrows as nt } from "./nullthrows";
import { EPS, QUEUE_LIMIT, STACK_LIMIT } from "./constants";
import {
  orient2D,
  inTriangle,
  doCross,
  intersect,
  onSegment,
  pointsEqual,
} from "./checks";
import type { Point } from "./types";
import { P } from "./types";
import { EdgeContext } from "./EdgeContext";
import { StaticStack } from "./StaticStack";
import { StaticQueue } from "./StaticQueue";
import { StaticRing } from "./StaticRing";
import { isConvexQuad, isDelaunay, getVertex } from "./edges";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function locatePoint(
  ctx: EdgeContext,
  px: number,
  py: number,
  start: number,
): number | null {
  let current = start;
  let i = 0;
  while (i < 10_000) {
    i += 1;

    const ax = ctx.originX[current]!;
    const ay = ctx.originY[current]!;

    const bIdx = ctx.next[current]!;
    if (bIdx === -1) {
      throw new Error("Half-edge has no `next` reference");
    }
    const bx = ctx.originX[bIdx]!;
    const by = ctx.originY[bIdx]!;

    const cIdx = ctx.next[bIdx]!;
    if (cIdx === -1) {
      throw new Error("Half-edge has no `next` reference");
    }
    const cx = ctx.originX[cIdx]!;
    const cy = ctx.originY[cIdx]!;

    if (inTriangle(px, py, ax, ay, bx, by, cx, cy)) {
      return current;
    }

    let nextEdge = -1;

    // Check edge bIdx
    const orientB = orient2D(bx, by, cx, cy, px, py);
    if (orientB < 0) {
      const twin = ctx.twin[bIdx]!;
      if (twin === -1) {
        return null;
      }
      nextEdge = twin;
    } else {
      // Check edge cIdx
      const orientC = orient2D(cx, cy, ax, ay, px, py);
      if (orientC < 0) {
        const twin = ctx.twin[cIdx]!;
        if (twin === -1) {
          return null;
        }
        nextEdge = twin;
      }
    }

    if (nextEdge === -1) {
      throw new Error("locatePoint failed to advance");
    }

    current = nextEdge;
  }

  throw new Error("locatePoint exceeded iteration cap");
}

export function square(ctx: EdgeContext, width: number, height: number): void {
  const a = P(0, 0);
  const b = P(width, 0);
  const c = P(width, height);
  const d = P(0, height);

  const ab = ctx.create({ x: a.x, y: a.y });
  const bc = ctx.create({ x: b.x, y: b.y });
  const ca = ctx.create({ x: c.x, y: c.y });
  ctx.setNext(ab, bc);
  ctx.setNext(bc, ca);
  ctx.setNext(ca, ab);

  const cd = ctx.create({ x: c.x, y: c.y });
  const da = ctx.create({ x: d.x, y: d.y });
  const ac = ctx.create({ x: a.x, y: a.y });
  ctx.setNext(cd, da);
  ctx.setNext(da, ac);
  ctx.setNext(ac, cd);

  ctx.setTwin(ac, ca);
  ctx.setTwin(ca, ac);
}

export function flip(ctx: EdgeContext, edge: number): void {
  const twin = nt(ctx.twin[edge], "Half-edge has no twin");
  assert(!ctx.isFixed(edge) && !ctx.isFixed(twin), "cannot flip fixed edge");
  assert(isConvexQuad(ctx, edge), "flip requires convex quad");

  const ac = edge;
  const ca = twin;
  const ab = nt(ctx.next[ca], "Half-edge has no `next` reference");
  const bc = nt(ctx.next[ab], "Half-edge has no `next` reference");
  const cd = nt(ctx.next[ac], "Half-edge has no `next` reference");
  const da = nt(ctx.next[cd], "Half-edge has no `next` reference");

  ctx.setOrigin(ac, ctx.origin(da));
  ctx.setOrigin(ca, ctx.origin(bc));

  ctx.setNext(ac, bc);
  ctx.setNext(cd, ac);
  ctx.setNext(bc, cd);

  ctx.setNext(ca, da);
  ctx.setNext(ab, ca);
  ctx.setNext(da, ab);
}

export function flipEdges(ctx: EdgeContext, stack: StaticStack): void {
  while (true) {
    const e = stack.pop();
    if (e === null) {
      break;
    }
    const edge = e;
    const twin = ctx.getTwin(edge);
    if (twin === -1) {
      continue;
    }
    if (ctx.isFixed(edge) || ctx.isFixed(twin)) {
      continue;
    }
    if (isDelaunay(ctx, edge)) {
      continue;
    }

    const fNext = nt(ctx.next[twin], "Half-edge has no `next` reference");
    const fNextNext = nt(ctx.next[fNext], "Half-edge has no `next` reference");
    stack.push(fNext);
    stack.push(fNextNext);
    flip(ctx, edge);
  }
}

export function findSharedEdge(
  ctx: EdgeContext,
  edge: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
): number {
  const start = getVertex(ctx, e1x, e1y, edge);
  assert(start !== -1, "findSharedEdge: e1 not a vertex");
  let current = start;
  const LIMIT = 100;
  let i = 0;

  while (i < LIMIT) {
    i += 1;
    const ax = ctx.originXAt(current);
    const ay = ctx.originYAt(current);
    const bIdx = nt(ctx.next[current], "Half-edge has no `next` reference");
    const bx = ctx.originXAt(bIdx);
    const by = ctx.originYAt(bIdx);
    if (pointsEqual(ax, ay, e1x, e1y) && pointsEqual(bx, by, e2x, e2y)) {
      return current;
    }
    const twin = ctx.getTwin(current);
    if (twin === -1) {
      break;
    }
    current = nt(ctx.next[twin], "Half-edge has no `next` reference");
    if (current === start) {
      break;
    }
  }

  current = start;
  while (i < LIMIT) {
    i += 1;
    const ax = ctx.originXAt(current);
    const ay = ctx.originYAt(current);
    const bIdx = nt(ctx.next[current], "Half-edge has no `next` reference");
    const bx = ctx.originXAt(bIdx);
    const by = ctx.originYAt(bIdx);
    if (pointsEqual(ax, ay, e1x, e1y) && pointsEqual(bx, by, e2x, e2y)) {
      return current;
    }
    const next = ctx.getTwin(
      nt(
        ctx.next[nt(ctx.next[current], "Half-edge has no `next` reference")],
        "Half-edge has no `next` reference",
      ),
    );
    if (next === -1) {
      break;
    }
    current = next;
    if (current === start) {
      break;
    }
  }
  return -1;
}

function insertPointInEdge(
  ctx: EdgeContext,
  px: number,
  py: number,
  edge: number,
): void {
  const p = P(px, py);
  const ac = edge;
  const cd = nt(ctx.next[ac], "Half-edge has no `next` reference");
  const da = nt(ctx.next[cd], "Half-edge has no `next` reference");

  const pd = ctx.create({ x: p.x, y: p.y });
  const dp = ctx.create({ x: ctx.origin(da).x, y: ctx.origin(da).y });
  ctx.setTwin(pd, dp);
  ctx.setTwin(dp, pd);

  ctx.setNext(ac, pd);
  ctx.setNext(pd, da);

  const pc = ctx.create({ x: p.x, y: p.y, fixed: ctx.isFixed(ac) });
  ctx.setNext(pc, cd);
  ctx.setNext(dp, pc);
  ctx.setNext(cd, dp);

  insertStack.reset();
  insertStack.push(cd);
  insertStack.push(da);

  const pa = ctx.getTwin(ac);
  if (pa !== -1) {
    ctx.setOrigin(pa, p);
    const ab = nt(ctx.next[pa], "Half-edge has no `next` reference");

    const cp = ctx.create({
      x: ctx.origin(cd).x,
      y: ctx.origin(cd).y,
      fixed: ctx.isFixed(pa),
    });
    ctx.setTwin(pc, cp);
    ctx.setTwin(cp, pc);

    const bc = nt(ctx.next[ab], "Half-edge has no `next` reference");
    const pb = ctx.create({ x: p.x, y: p.y });
    const bp = ctx.create({ x: ctx.origin(bc).x, y: ctx.origin(bc).y });
    ctx.setTwin(pb, bp);
    ctx.setTwin(bp, pb);

    ctx.setNext(ab, bp);
    ctx.setNext(bp, pa);

    ctx.setNext(cp, pb);
    ctx.setNext(pb, bc);
    ctx.setNext(bc, cp);

    insertStack.push(ab);
    insertStack.push(bc);
  }

  flipEdges(ctx, insertStack);
}

function insertPointInFace(
  ctx: EdgeContext,
  px: number,
  py: number,
  edge: number,
): void {
  const p = P(px, py);
  const ab = edge;
  const bc = nt(ctx.next[ab], "Half-edge has no `next` reference");
  const ca = nt(ctx.next[bc], "Half-edge has no `next` reference");

  const a = ctx.origin(ab);
  const b = ctx.origin(bc);
  const c = ctx.origin(ca);

  const pa = ctx.create({ x: p.x, y: p.y });
  const ap = ctx.create({ x: a.x, y: a.y });
  ctx.setTwin(pa, ap);
  ctx.setTwin(ap, pa);
  ctx.setNext(pa, ab);

  const pb = ctx.create({ x: p.x, y: p.y });
  const bp = ctx.create({ x: b.x, y: b.y });
  ctx.setTwin(pb, bp);
  ctx.setTwin(bp, pb);
  ctx.setNext(pb, bc);

  const pc = ctx.create({ x: p.x, y: p.y });
  const cp = ctx.create({ x: c.x, y: c.y });
  ctx.setTwin(pc, cp);
  ctx.setTwin(cp, pc);
  ctx.setNext(pc, ca);

  ctx.setNext(ap, pc);
  ctx.setNext(bp, pa);
  ctx.setNext(cp, pb);

  ctx.setNext(ab, bp);
  ctx.setNext(bc, cp);
  ctx.setNext(ca, ap);

  insertStack.reset();
  insertStack.push(ab);
  insertStack.push(bc);
  insertStack.push(ca);
  flipEdges(ctx, insertStack);
}

export function insertPoint(ctx: EdgeContext, px: number, py: number): void {
  const start = ctx.any();
  const t = nt(locatePoint(ctx, px, py, start), "Edge not found");

  const tNext = nt(ctx.next[t], "Half-edge has no `next` reference");
  const tNextNext = nt(ctx.next[tNext], "Half-edge has no `next` reference");
  assert(
    nt(ctx.next[tNextNext], "Half-edge has no `next` reference") === t,
    "triangle connectivity broken",
  );

  const tx = ctx.originXAt(t);
  const ty = ctx.originYAt(t);
  const tNextX = ctx.originXAt(tNext);
  const tNextY = ctx.originYAt(tNext);
  const tNextNextX = ctx.originXAt(tNextNext);
  const tNextNextY = ctx.originYAt(tNextNext);

  if (
    pointsEqual(tx, ty, px, py) ||
    pointsEqual(tNextX, tNextY, px, py) ||
    pointsEqual(tNextNextX, tNextNextY, px, py)
  ) {
    return;
  }

  if (onSegment(px, py, tx, ty, tNextX, tNextY)) {
    insertPointInEdge(ctx, px, py, t);
  } else if (onSegment(px, py, tNextX, tNextY, tNextNextX, tNextNextY)) {
    insertPointInEdge(ctx, px, py, tNext);
  } else if (onSegment(px, py, tNextNextX, tNextNextY, tx, ty)) {
    insertPointInEdge(ctx, px, py, tNextNext);
  } else {
    insertPointInFace(ctx, px, py, t);
  }
}

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

// Reusable static instances to avoid allocation overhead
const flipStack = new GeometryStack();
const intersectQueue = new GeometryQueue();
const boundaryRing = new GeometryRing();
const insertStack = new GeometryStack();
const destroyStack = new GeometryStack();

function edgeLoopEdges(
  ctx: EdgeContext,
  edge: number,
): [number, number, number] {
  const b = nt(ctx.next[edge], "Half-edge has no `next` reference");
  const c = nt(ctx.next[b], "Half-edge has no `next` reference");
  return [edge, b, c];
}

function hasIntersection(
  ctx: EdgeContext,
  edge: number,
  e1: Point,
  e2: Point,
): boolean {
  const a = ctx.origin(edge);
  const b = ctx.origin(nt(ctx.next[edge], "Half-edge has no `next` reference"));
  return intersect(a.x, a.y, b.x, b.y, e1.x, e1.y, e2.x, e2.y) !== null;
}

function findStartEdgeForIntersect(
  ctx: EdgeContext,
  inTriangleEdge: number,
  e1: Point,
  e2: Point,
): number {
  const LIMIT = 20;
  const start = getVertex(ctx, e1.x, e1.y, inTriangleEdge);
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
    if (twin === -1) {
      break;
    }
    current = nt(ctx.next[twin], "Half-edge has no `next` reference");
    if (current === start) {
      break;
    }
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

    const next = ctx.getTwin(
      nt(
        ctx.next[nt(ctx.next[current], "Half-edge has no `next` reference")],
        "Half-edge has no `next` reference",
      ),
    );
    if (next === -1) {
      break;
    }
    current = next;
    if (current === start) {
      break;
    }
    i += 1;
  }

  return -1;
}

// removed: setNextSafe passthrough; inline ctx.setNext directly

export function getIntersecting(
  ctx: EdgeContext,
  queue: GeometryQueue,
  seed: number,
  e1: Point,
  e2: Point,
): void {
  queue.reset();
  const inTriangleEdge = locatePoint(ctx, e1.x, e1.y, seed);
  if (inTriangleEdge === null) {
    throw new Error("E1NotInAnyTriangle");
  }

  const LIMIT = 20;
  const startEdge = findStartEdgeForIntersect(ctx, inTriangleEdge, e1, e2);

  if (startEdge === -1) {
    throw new Error("NoSuitableStartEdge");
  }

  let current = startEdge;
  let iterations = 0;
  while (iterations < LIMIT) {
    iterations += 1;
    const first = nt(ctx.next[current], "Half-edge has no `next` reference");
    const second = nt(ctx.next[first], "Half-edge has no `next` reference");

    for (const edge of [first, second]) {
      const a = ctx.origin(edge);
      const b = ctx.origin(
        nt(ctx.next[edge], "Half-edge has no `next` reference"),
      );
      const intersection = intersect(
        a.x,
        a.y,
        b.x,
        b.y,
        e1.x,
        e1.y,
        e2.x,
        e2.y,
      );
      if (intersection !== null) {
        const twin = ctx.getTwin(edge);
        assert(twin !== -1, "intersecting edge should have a twin");
        queue.push(edge);
        current = twin;
      }
    }
  }
}

function markCrossing(
  ctx: EdgeContext,
  edge: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
): void {
  const LIMIT = 100;
  let current = edge;
  let i = 0;

  while (i < LIMIT) {
    i += 1;
    const [e0, e1Idx, e2Idx] = edgeLoopEdges(ctx, current);
    for (const candidate of [e0, e1Idx, e2Idx]) {
      const ax = ctx.originXAt(candidate);
      const ay = ctx.originYAt(candidate);
      const bIdx = nt(ctx.next[candidate], "Half-edge has no `next` reference");
      const bx = ctx.originXAt(bIdx);
      const by = ctx.originYAt(bIdx);
      if (
        onSegment(ax, ay, e1x, e1y, e2x, e2y) &&
        onSegment(bx, by, e1x, e1y, e2x, e2y)
      ) {
        ctx.setFixed(candidate, true);
        const twin = ctx.getTwin(candidate);
        if (twin !== -1) {
          ctx.setFixed(twin, true);
        }
      }
    }

    const twin = ctx.getTwin(current);
    if (twin === -1) {
      break;
    }
    current = nt(ctx.next[twin], "Half-edge has no `next` reference");
    if (current === edge) {
      break;
    }
  }

  current = edge;
  i = 0;
  while (i < LIMIT) {
    i += 1;
    const [e0, e1Idx, e2Idx] = edgeLoopEdges(ctx, current);
    for (const candidate of [e0, e1Idx, e2Idx]) {
      const ax = ctx.originXAt(candidate);
      const ay = ctx.originYAt(candidate);
      const bIdx = nt(ctx.next[candidate], "Half-edge has no `next` reference");
      const bx = ctx.originXAt(bIdx);
      const by = ctx.originYAt(bIdx);
      if (
        onSegment(ax, ay, e1x, e1y, e2x, e2y) &&
        onSegment(bx, by, e1x, e1y, e2x, e2y)
      ) {
        ctx.setFixed(candidate, true);
        const twin = ctx.getTwin(candidate);
        if (twin !== -1) {
          ctx.setFixed(twin, true);
        }
      }
    }

    const next = ctx.getTwin(
      nt(
        ctx.next[nt(ctx.next[current], "Half-edge has no `next` reference")],
        "Half-edge has no `next` reference",
      ),
    );
    if (next === -1) {
      break;
    }
    current = next;
    if (current === edge) {
      break;
    }
  }
}

export function enforceEdge(
  ctx: EdgeContext,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
): void {
  intersectQueue.reset();
  const anyEdge = ctx.any();
  const p = locatePoint(ctx, e1x, e1y, anyEdge);
  if (p === null) {
    throw new Error("EdgeNotFound");
  }

  const vertex = getVertex(ctx, e1x, e1y, p);
  if (vertex !== -1) {
    const shared = findSharedEdge(ctx, p, e1x, e1y, e2x, e2y);
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
    if (popped === null) {
      break;
    }
    const edge = popped;

    if (ctx.isFixed(edge)) {
      const ax = ctx.originXAt(edge);
      const ay = ctx.originYAt(edge);
      const bIdx = nt(ctx.next[edge], "Half-edge has no `next` reference");
      const bx = ctx.originXAt(bIdx);
      const by = ctx.originYAt(bIdx);
      const intersection = intersect(e1x, e1y, e2x, e2y, ax, ay, bx, by);
      assert(intersection !== null, "Expected intersection to exist");
      insertPointInEdge(ctx, intersection!.x, intersection!.y, edge);
      const next = nt(ctx.next[edge], "Half-edge has no `next` reference");
      markCrossing(ctx, next, e1x, e1y, e2x, e2y);
      continue;
    }

    if (!isConvexQuad(ctx, edge)) {
      intersectQueue.push(edge);
      continue;
    }

    flip(ctx, edge);

    const originX = ctx.originXAt(edge);
    const originY = ctx.originYAt(edge);
    const destIdx = nt(ctx.next[edge], "Half-edge has no `next` reference");
    const destX = ctx.originXAt(destIdx);
    const destY = ctx.originYAt(destIdx);
    if (
      onSegment(originX, originY, e1x, e1y, e2x, e2y) &&
      onSegment(destX, destY, e1x, e1y, e2x, e2y)
    ) {
      ctx.setFixed(edge, true);
      const twin = ctx.getTwin(edge);
      if (twin !== -1) {
        ctx.setFixed(twin, true);
      }
    }

    if (doCross(e1x, e1y, e2x, e2y, originX, originY, destX, destY)) {
      intersectQueue.push(edge);
    }
  }
}

function isBoundaryEdge(ctx: EdgeContext, edge: number): boolean {
  return ctx.getTwin(edge) === -1;
}

function ringContains(ring: GeometryRing, edge: number): boolean {
  const first = ring.first;
  if (first === -1) {
    return false;
  }
  let node = first;
  do {
    if (ring.valueOf(node) === edge) {
      return true;
    }
    node = ring.nextOf(node);
  } while (node !== first);
  return false;
}

function destroyEdgeIfInternal(
  ctx: EdgeContext,
  edge: number,
  boundary: GeometryRing,
): void {
  if (!isBoundaryEdge(ctx, edge) && !ringContains(boundary, edge)) {
    ctx.destroy(edge);
  }
}

export function collectBoundary(
  ctx: EdgeContext,
  boundary: GeometryRing,
  px: number,
  py: number,
): void {
  boundary.reset();
  const anyEdge = ctx.any();
  const startTriangle = locatePoint(ctx, px, py, anyEdge);
  if (startTriangle === null) {
    throw new Error("EdgeNotFound");
  }

  const startVertex = getVertex(ctx, px, py, startTriangle);
  if (startVertex === -1) {
    throw new Error("NotVertex");
  }

  let current = startVertex;
  const LIMIT = 128;
  let i = 0;
  let continueCW = false;
  destroyStack.reset();

  while (i < LIMIT) {
    const next = nt(ctx.next[current], "Half-edge has no `next` reference");
    boundary.append(next);

    destroyStack.push(current);
    destroyStack.push(nt(ctx.next[next], "Half-edge has no `next` reference"));

    const twin = ctx.getTwin(
      nt(ctx.next[next], "Half-edge has no `next` reference"),
    );
    if (twin === -1) {
      boundary.append(nt(ctx.next[next], "Half-edge has no `next` reference"));
      continueCW = true;
      break;
    }

    current = twin;
    if (current === startVertex) {
      break;
    }
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
      const next = nt(
        ctx.next[nt(ctx.next[current], "Half-edge has no `next` reference")],
        "Half-edge has no `next` reference",
      );
      boundary.prepend(next);

      destroyStack.push(current);
      destroyStack.push(
        nt(ctx.next[current], "Half-edge has no `next` reference"),
      );

      const nextTwin = ctx.getTwin(
        nt(ctx.next[current], "Half-edge has no `next` reference"),
      );
      if (nextTwin === -1) {
        boundary.prepend(
          nt(ctx.next[current], "Half-edge has no `next` reference"),
        );
        break;
      }
      current = nextTwin;
    }
  }

  while (true) {
    const edge = destroyStack.pop();
    if (edge === null) {
      break;
    }
    destroyEdgeIfInternal(ctx, edge, boundary);
  }
}

export function removeCollinear(
  ctx: EdgeContext,
  boundary: GeometryRing,
): void {
  let aNode = boundary.first;
  if (aNode === -1) {
    return;
  }
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
        orient2D(
          ctx.originXAt(aEdge),
          ctx.originYAt(aEdge),
          ctx.originXAt(bEdge),
          ctx.originYAt(bEdge),
          ctx.originXAt(cEdge),
          ctx.originYAt(cEdge),
        ),
      ) <= EPS;

    if (isOnBoundary && collinear) {
      ctx.destroy(bEdge);
      ctx.setNext(aEdge, cEdge);
      boundary.remove(bNode);
      if (boundary.length() < 3) {
        break;
      }
      bNode = boundary.nextOf(aNode);
      cNode = boundary.nextOf(bNode);
      continue;
    }

    aNode = boundary.nextOf(aNode);
    bNode = boundary.nextOf(aNode);
    cNode = boundary.nextOf(bNode);
    if (aNode === boundary.first) {
      break;
    }
  }
}

function computeIsEar(
  ctx: EdgeContext,
  boundary: GeometryRing,
  aNode: number,
  bNode: number,
  cNode: number,
  aPoint: Point,
  bPoint: Point,
  cPoint: Point,
): boolean {
  if (
    orient2D(aPoint.x, aPoint.y, bPoint.x, bPoint.y, cPoint.x, cPoint.y) <= 0
  ) {
    return false;
  }
  let other = boundary.first;
  if (other === -1) {
    return true;
  }
  do {
    if (other !== aNode && other !== bNode && other !== cNode) {
      const p = ctx.origin(boundary.valueOf(other));
      if (
        inTriangle(
          p.x,
          p.y,
          aPoint.x,
          aPoint.y,
          bPoint.x,
          bPoint.y,
          cPoint.x,
          cPoint.y,
        )
      )
        return false;
    }
    other = boundary.nextOf(other);
  } while (other !== boundary.first);

  return true;
}

export function fillCavity(ctx: EdgeContext, boundary: GeometryRing): void {
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

    const isEar = computeIsEar(
      ctx,
      boundary,
      aNode,
      bNode,
      cNode,
      aPoint,
      bPoint,
      cPoint,
    );

    if (isEar) {
      const ca = ctx.create({ x: cPoint.x, y: cPoint.y });
      const ac = ctx.create({ x: aPoint.x, y: aPoint.y });
      ctx.setTwin(ca, ac);
      ctx.setTwin(ac, ca);

      ctx.setNext(aEdge, bEdge);
      ctx.setNext(bEdge, ca);
      ctx.setNext(ca, aEdge);

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
    ctx.setNext(aEdge, bEdge);
    ctx.setNext(bEdge, cEdge);
    ctx.setNext(cEdge, aEdge);
  }

  flipEdges(ctx, flipStack);
}

export function removePoint(ctx: EdgeContext, px: number, py: number): void {
  boundaryRing.reset();
  collectBoundary(ctx, boundaryRing, px, py);
  removeCollinear(ctx, boundaryRing);
  fillCavity(ctx, boundaryRing);
}

export function validate(ctx: EdgeContext): void {
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
}
