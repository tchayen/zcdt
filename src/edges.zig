const std = @import("std");
const assert = std.debug.assert;
const expect = std.testing.expect;
const eql = std.meta.eql;
const types = @import("types.zig");
const Point = types.Point;
const P = types.P;
const HalfEdge = types.HalfEdge;
const checks = @import("checks.zig");
const orient2D = checks.orient2D;
const inCircle = checks.inCircle;

// This module is about basic checks for half-edge structure.

/// Check if quad defined by two triangles sharing `e` is convex.
pub fn isConvexQuad(e: *HalfEdge) bool {
    assert(e.twin != null);

    const a = e.origin;
    const c = e.next.?.origin;
    const d = e.next.?.next.?.origin;
    const b = e.twin.?.next.?.next.?.origin;

    return orient2D(a, b, c) > 0 and
        orient2D(b, c, d) > 0 and
        orient2D(c, d, a) > 0 and
        orient2D(d, a, b) > 0;
}

test "isConvexQuad" {
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(1, 1);
    const d = P(0, 1);

    var ab = HalfEdge{ .origin = a };
    var bc = HalfEdge{ .origin = b };
    var ca = HalfEdge{ .origin = c };
    ab.next = &bc;
    bc.next = &ca;
    ca.next = &ab;

    var cd = HalfEdge{ .origin = c };
    var da = HalfEdge{ .origin = d };
    var ac = HalfEdge{ .origin = a };
    cd.next = &da;
    da.next = &ac;
    ac.next = &cd;

    ac.twin = &ca;
    ca.twin = &ac;

    try expect(isConvexQuad(&ac));
}

/// Edge is delaunay if point on the opposite side is outside circumcircle of
/// triangle on this side. It is mutual so one check is enough.
pub fn isDelaunay(e: *HalfEdge) bool {
    assert(e.next.?.next.?.next == e);
    assert(e.twin != null);
    const t1 = e.origin;
    const t2 = e.next.?.origin;
    const t3 = e.next.?.next.?.origin;
    const d = e.twin.?.next.?.next.?.origin;
    return inCircle(d, t1, t2, t3) < 0;
}

test "isDelaunay - it is" {
    const a = P(0, 0);
    const b = P(40, 40);
    const c = P(0, 100);
    const d = P(60, 80);

    var ab = HalfEdge{ .origin = a };
    var bc = HalfEdge{ .origin = b };
    var ca = HalfEdge{ .origin = c };

    ab.next = &bc;
    bc.next = &ca;
    ca.next = &ab;

    var ac = HalfEdge{ .origin = a };
    var cd = HalfEdge{ .origin = c };
    var da = HalfEdge{ .origin = d };
    ac.next = &cd;
    cd.next = &da;
    da.next = &ac;

    ac.twin = &ca;
    ca.twin = &ac;

    try expect(isDelaunay(&ac) == true);
    try expect(isDelaunay(&ca) == true);
}

/// Return edge with origin at `p` if it is a vertex in the triangle formed by `e`.
pub fn getVertex(p: Point, e: *HalfEdge) ?*HalfEdge {
    assert(e.next.?.next.?.next == e);
    return if (eql(e.origin, p)) e else if (eql(e.next.?.origin, p)) e.next.? else if (eql(e.next.?.next.?.origin, p)) e.next.?.next.? else null;
}

/// Checks for point equality of `e` (in either order).
pub fn isEdgeEqual(e: *HalfEdge, e1: Point, e2: Point) bool {
    return (eql(e.origin, e1) and eql(e.next.?.origin, e2)) or
        (eql(e.origin, e2) and eql(e.next.?.origin, e1));
}
