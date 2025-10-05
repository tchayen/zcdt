import { describe, expect, test } from "vitest";
import { EdgeContext } from "../src/edgeContext";
import { P } from "../src/types";
import {
  locatePoint,
  square,
  flip,
  findSharedEdge,
  insertPoint,
} from "../src/geometry";

const setupTriangle = () => {
  const edges = new EdgeContext(16);
  const a = P(0, 0);
  const b = P(1, 0);
  const c = P(0, 1);

  const ab = edges.create({ origin: a });
  const bc = edges.create({ origin: b });
  const ca = edges.create({ origin: c });
  edges.setNext(ab, bc);
  edges.setNext(bc, ca);
  edges.setNext(ca, ab);
  return { edges, ab, bc, ca };
};

describe("geometry basics", () => {
  test("locatePoint finds containing triangle", () => {
    const { edges, ab } = setupTriangle();
    const point = P(0.1, 0.1);
    const containing = locatePoint(edges, point.x, point.y, ab);
    expect(containing).toBe(ab);
  });

  test("locatePoint returns null when stepping outside boundary", () => {
    const { edges, ab } = setupTriangle();
    const point = P(2, 2);
    expect(locatePoint(edges, point.x, point.y, ab)).toBeNull();
  });

  test("flip updates connectivity", () => {
    const edges = new EdgeContext(16);
    const a = P(0, 3);
    const b = P(3, 0);
    const c = P(5, 5);
    const d = P(1, 6);

    const ab = edges.create({ origin: a });
    const bc = edges.create({ origin: b });
    const ca = edges.create({ origin: c });
    edges.setNext(ab, bc);
    edges.setNext(bc, ca);
    edges.setNext(ca, ab);

    const ac = edges.create({ origin: a });
    const cd = edges.create({ origin: c });
    const da = edges.create({ origin: d });
    edges.setNext(ac, cd);
    edges.setNext(cd, da);
    edges.setNext(da, ac);

    edges.setTwin(ac, ca);
    edges.setTwin(ca, ac);

    flip(edges, ac);
    expect(edges.getNext(ac)).toBe(bc);
  });

  test("findSharedEdge discovers direct edge", () => {
    const edges = new EdgeContext(32);
    square(edges, 4, 4);
    const any = edges.any();
    const point = edges.origin(any);
    const startEdge = locatePoint(edges, point.x, point.y, any);
    expect(startEdge).not.toBeNull();
    const shared = findSharedEdge(edges, startEdge!, point.x, point.y, 4, 4);
    expect(shared).not.toBe(-1);
  });

  test("insertPoint creates vertex and is idempotent", () => {
    const edges = new EdgeContext(256);
    square(edges, 100, 100);
    const initialCount = edges.count();

    const p = P(40, 40);
    insertPoint(edges, 40, 40);
    const withPoint = Array.from(edges.iterator()).some((edge) => {
      const origin = edges.origin(edge);
      return Math.abs(origin.x - p.x) < 1e-6 && Math.abs(origin.y - p.y) < 1e-6;
    });
    expect(withPoint).toBe(true);

    const afterInsertCount = edges.count();
    insertPoint(edges, 40, 40);
    expect(edges.count()).toBe(afterInsertCount);

    const onEdge = P(50, 0);
    insertPoint(edges, 50, 0);
    const onEdgeExists = Array.from(edges.iterator()).some((edge) => {
      const origin = edges.origin(edge);
      return (
        Math.abs(origin.x - onEdge.x) < 1e-6 &&
        Math.abs(origin.y - onEdge.y) < 1e-6
      );
    });
    expect(onEdgeExists).toBe(true);
    expect(edges.count()).toBeGreaterThan(afterInsertCount);
  });
});
