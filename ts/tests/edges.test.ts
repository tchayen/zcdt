import { describe, expect, test } from "vitest";
import { EdgeContext } from "../src/edgeContext";
import { P } from "../src/types";
import { isConvexQuad, isDelaunay, getVertex, isEdgeEqual } from "../src/edges";

describe("edges helpers", () => {
  test("isConvexQuad", () => {
    const edges = new EdgeContext(16);
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(1, 1);
    const d = P(0, 1);

    const ab = edges.create({ x: a.x, y: a.y });
    const bc = edges.create({ x: b.x, y: b.y });
    const ca = edges.create({ x: c.x, y: c.y });
    edges.setNext(ab, bc);
    edges.setNext(bc, ca);
    edges.setNext(ca, ab);

    const cd = edges.create({ x: c.x, y: c.y });
    const da = edges.create({ x: d.x, y: d.y });
    const ac = edges.create({ x: a.x, y: a.y });
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

    const ab = edges.create({ x: a.x, y: a.y });
    const bc = edges.create({ x: b.x, y: b.y });
    const ca = edges.create({ x: c.x, y: c.y });
    edges.setNext(ab, bc);
    edges.setNext(bc, ca);
    edges.setNext(ca, ab);

    const ac = edges.create({ x: a.x, y: a.y });
    const cd = edges.create({ x: c.x, y: c.y });
    const da = edges.create({ x: d.x, y: d.y });
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

    const ab = edges.create({ x: a.x, y: a.y });
    const bc = edges.create({ x: b.x, y: b.y });
    const ca = edges.create({ x: c.x, y: c.y });
    edges.setNext(ab, bc);
    edges.setNext(bc, ca);
    edges.setNext(ca, ab);

    expect(getVertex(edges, a.x, a.y, ab)).toBe(ab);
    expect(getVertex(edges, b.x, b.y, ab)).toBe(bc);
    expect(getVertex(edges, c.x, c.y, ab)).toBe(ca);
    const p = P(2, 2);
    expect(getVertex(edges, p.x, p.y, ab)).toBe(-1);
  });

  test("isEdgeEqual", () => {
    const edges = new EdgeContext(8);
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(0, 1);

    const ab = edges.create({ x: a.x, y: a.y });
    const bc = edges.create({ x: b.x, y: b.y });
    const ca = edges.create({ x: c.x, y: c.y });
    edges.setNext(ab, bc);
    edges.setNext(bc, ca);
    edges.setNext(ca, ab);

    expect(isEdgeEqual(edges, ab, a.x, a.y, b.x, b.y)).toBe(true);
    expect(isEdgeEqual(edges, ab, b.x, b.y, a.x, a.y)).toBe(true);
    expect(isEdgeEqual(edges, ab, a.x, a.y, c.x, c.y)).toBe(false);
  });
});
