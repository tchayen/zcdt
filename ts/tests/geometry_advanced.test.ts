import { describe, expect, test } from "vitest";
import { EdgeContext } from "../src/edgeContext";
import { P } from "../src/types";
import type { Point } from "../src/types";
import {
  square,
  locatePoint,
  getIntersecting,
  enforceEdge,
  collectBoundary,
  removePoint,
  GeometryQueue,
  GeometryRing,
} from "../src/geometry";
import { insertPoint } from "../src/geometry";
import { insertSquare } from "../src/utils";
import { getVertexPoint } from "../src/edges";

const pointEquals = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean => {
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
};

const getVertexIndex = (ctx: EdgeContext, p: Point, edge: number): number => {
  return getVertexPoint(ctx, p, edge);
};

describe("geometry advanced functions", () => {
  test("getIntersecting finds edges crossing segment", () => {
    const edges = new EdgeContext(512);

    square(edges, 100, 100);
    insertPoint(edges, 40, 40);
    insertPoint(edges, 60, 80);

    const queue = new GeometryQueue();
    const seed = locatePoint(edges, 100, 100, edges.any());
    expect(seed).not.toBeNull();
    getIntersecting(edges, queue, seed!, P(100, 100), P(0, 0));

    const collected: number[] = [];
    for (let value = queue.pop(); value !== null; value = queue.pop()) {
      collected.push(value);
    }
    expect(collected.length).toBeGreaterThan(0);

    edges.reset();
    square(edges, 100, 100);
    insertPoint(edges, 30, 40);
    insertPoint(edges, 10, 70);
    insertPoint(edges, 50, 50);
    insertPoint(edges, 20, 45);
    enforceEdge(edges, 30, 40, 10, 70);
    enforceEdge(edges, 10, 70, 50, 50);

    const queue2 = new GeometryQueue();
    const e1 = P(50, 50);
    const e2 = P(20, 45);
    const tri = locatePoint(edges, e1.x, e1.y, edges.any());
    expect(tri).not.toBeNull();
    const start = getVertexIndex(edges, e1, tri!);
    expect(start).not.toBe(-1);
    getIntersecting(edges, queue2, start, e1, e2);

    const popped = queue2.pop();
    expect(popped).not.toBeNull();
    const origin = edges.origin(popped!);
    const dest = edges.origin(edges.getNext(popped!));
    expect(pointEquals(origin, P(10, 70))).toBe(true);
    expect(pointEquals(dest, P(30, 40))).toBe(true);
    expect(queue2.pop()).toBeNull();
  });

  test("collectBoundary trims fan around vertex", () => {
    const edges = new EdgeContext(512);
    square(edges, 4, 4);
    insertSquare(edges, 0, 0, 1);
    insertSquare(edges, 1, 0, 1);

    const ring = new GeometryRing();
    collectBoundary(edges, ring, 2, 1);

    expect(edges.count()).toBe(15);

    const expected: Array<[Point, Point]> = [
      [P(0, 4), P(1, 1)],
      [P(4, 4), P(0, 4)],
      [P(4, 0), P(4, 4)],
      [P(2, 0), P(4, 0)],
      [P(1, 0), P(2, 0)],
      [P(1, 1), P(1, 0)],
    ];

    const actual: Array<[Point, Point]> = [];
    let node = ring.first;
    if (node !== -1) {
      do {
        const edgeIdx = ring.valueOf(node);
        const nextNode = ring.nextOf(node);
        const nextIdx = ring.valueOf(nextNode);
        actual.push([edges.origin(edgeIdx), edges.origin(nextIdx)]);
        node = nextNode;
      } while (node !== ring.first && actual.length < expected.length);
    }

    expect(actual.length).toBe(expected.length);

    const serialize = (a: Point, b: Point) => `${a.x},${a.y}->${b.x},${b.y}`;
    const actualSet = new Set(actual.map(([a, b]) => serialize(a, b)));
    const expectedSet = new Set(expected.map(([a, b]) => serialize(a, b)));
    expect(actualSet).toStrictEqual(expectedSet);
  });

  test("removePoint removes vertex and fills cavity", () => {
    const edges = new EdgeContext(512);
    square(edges, 4, 4);
    insertSquare(edges, 0, 0, 1);
    insertSquare(edges, 1, 0, 1);

    const initial = edges.count();
    removePoint(edges, 2, 1);
    expect(edges.count()).toBeLessThan(initial);

    expect(() => removePoint(edges, 3, 3)).toThrow();
    expect(() => removePoint(edges, -1, -1)).toThrow();
  });
});
