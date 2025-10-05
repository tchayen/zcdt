import { describe, expect, test } from "vitest";
import { EdgeContext } from "../src/edgeContext";

describe("EdgeContext", () => {
  test("basic allocation lifecycle", () => {
    const edges = new EdgeContext(32);
    const e1 = edges.create({ x: 0, y: 0 });
    const e2 = edges.create({ x: 10, y: 10 });

    expect(edges.count()).toBe(2);
    expect(edges.countUsed()).toBeGreaterThanOrEqual(2);

    edges.destroy(e1);
    expect(edges.count()).toBe(1);

    const iterated = Array.from(edges.iterator());
    expect(iterated).toContain(e2);
  });

  test("any throws on empty", () => {
    const edges = new EdgeContext(4);
    expect(() => edges.any()).toThrow();
    const e = edges.create({ x: 1, y: 1 });
    expect(edges.any()).toBe(e);
  });
});
