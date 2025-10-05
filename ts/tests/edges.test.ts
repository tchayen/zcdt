import { describe, expect, test } from "vitest";
import { EdgeContext } from "../src/edgeContext";
import { P } from "../src/types";
import {
  isConvexQuad,
  isDelaunay,
  getVertexPoint,
  isEdgeEqualPoint,
} from "../src/edges";

describe("edges helpers", () => {
  test("isConvexQuad", () => {
    const edges = new EdgeContext(16);
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(1, 1);
    const d = P(0, 1);

    const ab = edges.create({ origin: a });
    const bc = edges.create({ origin: b });
    const ca = edges.create({ origin: c });
    edges.setNext(ab, bc);
    edges.setNext(bc, ca);
    edges.setNext(ca, ab);

    const cd = edges.create({ origin: c });
    const da = edges.create({ origin: d });
    const ac = edges.create({ origin: a });
    edges.setNext(cd, da);
    edges.setNext(da, ac);
    edges.setNext(ac, cd);

    edges.setTwin(ac, ca);
    edges.setTwin(ca, ac);

    expect(isConvexQuad(edges, ac)).toBe(true);
  });

  test("isDelaunay", () => {
    const edges = new EdgeContext(16);
    const a = P(0, 0);
    const b = P(40, 40);
    const c = P(0, 100);
    const d = P(60, 80);

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

    expect(isDelaunay(edges, ac)).toBe(true);
    expect(isDelaunay(edges, ca)).toBe(true);
  });

  test("getVertex", () => {
    const edges = new EdgeContext(8);
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(0, 1);

    const ab = edges.create({ origin: a });
    const bc = edges.create({ origin: b });
    const ca = edges.create({ origin: c });
    edges.setNext(ab, bc);
    edges.setNext(bc, ca);
    edges.setNext(ca, ab);

    expect(getVertexPoint(edges, a, ab)).toBe(ab);
    expect(getVertexPoint(edges, b, ab)).toBe(bc);
    expect(getVertexPoint(edges, c, ab)).toBe(ca);
    expect(getVertexPoint(edges, P(2, 2), ab)).toBe(-1);
  });

  test("isEdgeEqual", () => {
    const edges = new EdgeContext(8);
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(0, 1);

    const ab = edges.create({ origin: a });
    const bc = edges.create({ origin: b });
    const ca = edges.create({ origin: c });
    edges.setNext(ab, bc);
    edges.setNext(bc, ca);
    edges.setNext(ca, ab);

    expect(isEdgeEqualPoint(edges, ab, a, b)).toBe(true);
    expect(isEdgeEqualPoint(edges, ab, b, a)).toBe(true);
    expect(isEdgeEqualPoint(edges, ab, a, c)).toBe(false);
  });
});
