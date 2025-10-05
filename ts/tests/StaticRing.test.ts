import { describe, expect, test } from "vitest";
import { StaticRing } from "../src/StaticRing";

describe("StaticRing", () => {
  test("operations", () => {
    const ring = new StaticRing(4);
    const n1 = ring.append(10);
    expect(ring.valueOf(n1)).toBe(10);
    expect(ring.first).toBe(n1);
    expect(ring.last).toBe(n1);

    const n2 = ring.append(20);
    const n3 = ring.prepend(5);
    const n4 = ring.append(30);

    expect(ring.size).toBe(4);
    expect(() => ring.append(40)).toThrow();

    expect(ring.prevOf(ring.first)).toBe(ring.last);
    expect(ring.nextOf(ring.last)).toBe(ring.first);

    expect(ring.first).toBe(n3);
    expect(ring.nextOf(n3)).toBe(n1);
    expect(ring.nextOf(n1)).toBe(n2);
    expect(ring.nextOf(n2)).toBe(n4);
    expect(ring.nextOf(n4)).toBe(n3);

    ring.remove(n3);
    expect(ring.size).toBe(3);
    expect(ring.first).toBe(n1);
    expect(ring.prevOf(ring.first)).toBe(ring.last);
    expect(ring.nextOf(ring.last)).toBe(ring.first);
  });
});
