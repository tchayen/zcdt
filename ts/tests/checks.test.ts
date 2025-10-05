import { describe, expect, test } from "vitest";
import { P } from "../src/types";
import {
  orient2D,
  inTriangle,
  inCircle,
  doCross,
  intersect,
  onSegment,
} from "../src/checks";

describe("checks", () => {
  test("orient2D", () => {
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(0, 1);
    expect(orient2D(a, b, c)).toBe(1);
  });

  test("inTriangle", () => {
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(0, 1);
    const p = P(0.5, 0.5);
    expect(inTriangle(p, a, b, c)).toBe(true);
  });

  test("inCircle inside/on/outside", () => {
    const e1 = P(0, 0);
    const e2 = P(1, 0);
    const e3 = P(1, 1);
    expect(inCircle(P(0.5, 0.5), e1, e2, e3)).toBeGreaterThan(0);
    expect(inCircle(P(0, 0), e1, e2, e3)).toBe(0);
    expect(inCircle(P(0.5, 2), e1, e2, e3)).toBeLessThan(0);
  });

  test("doCross", () => {
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(1, 1);
    const d = P(0, 1);
    expect(doCross(a, c, b, d)).toBe(true);
    expect(doCross(a, b, c, d)).toBe(false);
  });

  test("intersect", () => {
    {
      const s1 = P(0, 0);
      const s2 = P(1, 1);
      const t1 = P(1, 0);
      const t2 = P(0, 1);
      const intersection = intersect(s1, s2, t1, t2);
      expect(intersection).not.toBeNull();
      expect(intersection!.x).toBeCloseTo(0.5, 10);
      expect(intersection!.y).toBeCloseTo(0.5, 10);
    }
    {
      const s1 = P(0, 0);
      const s2 = P(5, 2);
      const t1 = P(5, 2);
      const t2 = P(10, 10);
      expect(intersect(s1, s2, t1, t2)).toBeNull();
    }
    {
      const s1 = P(60, 80);
      const s2 = P(40, 40);
      const t1 = P(0, 0);
      const t2 = P(100, 100);
      expect(intersect(s1, s2, t1, t2)).toBeNull();
    }
  });

  test("onSegment", () => {
    const s1 = P(1, 1);
    const s2 = P(10, 10);
    expect(onSegment(P(5, 5), s1, s2)).toBe(true);
    expect(onSegment(P(4.999, 5), s1, s2)).toBe(false);
  });
});
