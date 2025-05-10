const std = @import("std");
const assert = std.debug.assert;
const expect = std.testing.expect;
const types = @import("types.zig");
const Point = types.Point;
const P = types.P;

// This module is all about basic geometric tests. A rule of thumb: if function
// needs to be aware of half-edge structure, it probably belongs somewhere
// higher.
const eps = 1e-10;

pub fn orient2D(a: Point, b: Point, c: Point) f32 {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

test "orient2D" {
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(0, 1);
    try expect(orient2D(a, b, c) == 1);
}

pub fn inTriangle(p: Point, e1: Point, e2: Point, e3: Point) bool {
    return (orient2D(e1, e2, p) > -eps and orient2D(e2, e3, p) > -eps and orient2D(e3, e1, p) > -eps);
}

test "inTriangle" {
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(0, 1);
    const p = P(0.5, 0.5);

    try expect(inTriangle(p, a, b, c));
}

/// Positive if point `p` is inside the circumcircle of triangle.
/// Negative if outside. Zero if on the circle.
pub fn inCircle(p: Point, t1: Point, t2: Point, t3: Point) f32 {
    const ax = t1.x - p.x;
    const ay = t1.y - p.y;
    const bx = t2.x - p.x;
    const by = t2.y - p.y;
    const cx = t3.x - p.x;
    const cy = t3.y - p.y;
    const ab = ax * ax + ay * ay;
    const cd = cx * cx + cy * cy;
    const bc = bx * bx + by * by;
    return (ax * (by * cd - bc * cy) -
        ay * (bx * cd - bc * cx) +
        ab * (bx * cy - by * cx));
}

test "inCircle - inside" {
    // Inside.
    {
        const e1 = P(0, 0);
        const e2 = P(1, 0);
        const e3 = P(1, 1);
        const p = P(0.5, 0.5);

        try expect(inCircle(p, e1, e2, e3) > 0);
    }
    // On the circle.
    {
        const e1 = P(0, 0);
        const e2 = P(1, 0);
        const e3 = P(1, 1);
        const p = P(0, 0);

        try expect(inCircle(p, e1, e2, e3) == 0);
    }
    // Outside.
    {
        const e1 = P(0, 0);
        const e2 = P(1, 0);
        const e3 = P(1, 1);
        const p = P(0.5, 2);

        try expect(inCircle(p, e1, e2, e3) < 0);
    }
}

/// Check if lines defined by two segments cross. Used for fast check when not
/// looking for exact point.
pub fn doCross(s1: Point, s2: Point, t1: Point, t2: Point) bool {
    const d1 = orient2D(t1, t2, s1);
    const d2 = orient2D(t1, t2, s2);
    const d3 = orient2D(s1, s2, t1);
    const d4 = orient2D(s1, s2, t2);
    return (d1 > 0 and d2 < 0) or
        (d1 < 0 and d2 > 0) or
        (d3 > 0 and d4 < 0) or
        (d3 < 0 and d4 > 0);
}

test "doCross" {
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(1, 1);
    const d = P(0, 1);
    try expect(doCross(a, c, b, d));
    try expect(!doCross(a, b, c, d));
}

pub fn intersect(s1: Point, s2: Point, t1: Point, t2: Point) ?Point {
    if (!doCross(s1, s2, t1, t2)) return null;

    const a1 = s2.y - s1.y;
    const b1 = s1.x - s2.x;
    const c1 = a1 * s1.x + b1 * s1.y;
    const a2 = t2.y - t1.y;
    const b2 = t1.x - t2.x;
    const c2 = a2 * t1.x + b2 * t1.y;

    const det = a1 * b2 - a2 * b1;
    if (@abs(det) < eps) return null; // Parallel or coincident lines.

    const x = (b2 * c1 - b1 * c2) / det;
    const y = (a1 * c2 - a2 * c1) / det;

    // Check if the intersection point lies within the line segments.
    if (x < @min(s1.x, s2.x) or x > @max(s1.x, s2.x) or
        y < @min(s1.y, s2.y) or y > @max(s1.y, s2.y) or
        x < @min(t1.x, t2.x) or x > @max(t1.x, t2.x) or
        y < @min(t1.y, t2.y) or y > @max(t1.y, t2.y))
        return null;

    // Exclude cases where the intersection point is an endpoint.
    if ((@abs(x - s1.x) < eps and @abs(y - s1.y) < eps) or
        (@abs(x - s2.x) < eps and @abs(y - s2.y) < eps) or
        (@abs(x - t1.x) < eps and @abs(y - t1.y) < eps) or
        (@abs(x - t2.x) < eps and @abs(y - t2.y) < eps))
        return null;

    return P(x, y);
}

test "intersect" {
    // Basic cross.
    {
        const s1 = P(0, 0);
        const s2 = P(1, 1);
        const t1 = P(1, 0);
        const t2 = P(0, 1);
        const intersection = intersect(s1, s2, t1, t2);
        if (intersection) |p| {
            try expect(@abs(p.x - 0.5) < eps);
            try expect(@abs(p.y - 0.5) < eps);
        } else unreachable;
    }
    // Segments touch with their ends.
    {
        const s1 = P(0, 0);
        const s2 = P(5, 2);
        const t1 = P(5, 2);
        const t2 = P(10, 10);
        const intersection = intersect(s1, s2, t1, t2);
        try expect(intersection == null);
    }
    // One segment ends in the middle of the other.
    {
        const s1 = P(60, 80);
        const s2 = P(40, 40);
        const t1 = P(0, 0);
        const t2 = P(100, 100);
        const intersection = intersect(s1, s2, t1, t2);
        try expect(intersection == null);
    }
}

/// Check if `p` lies on segment `s1`-`s2`.
pub fn onSegment(p: Point, s1: Point, s2: Point) bool {
    // Check if collinear.
    if (@abs(orient2D(s1, s2, p)) > eps) {
        return false;
    }

    return p.x >= @min(s1.x, s2.x) and
        p.x <= @max(s1.x, s2.x) and
        p.y >= @min(s1.y, s2.y) and
        p.y <= @max(s1.y, s2.y);
}

test "onSegment" {
    const s1 = P(1, 1);
    const s2 = P(10, 10);

    try expect(onSegment(P(5, 5), s1, s2));
    try expect(!onSegment(P(4.999, 5), s1, s2));
}
