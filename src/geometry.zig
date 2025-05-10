const std = @import("std");
const assert = std.debug.assert;
const expect = std.testing.expect;
const expectError = std.testing.expectError;
const eql = std.meta.eql;

const types = @import("types.zig");
const Point = types.Point;
const P = types.P;
const HalfEdge = types.HalfEdge;

const checks = @import("checks.zig");
const orient2D = checks.orient2D;
const inCircle = checks.inCircle;
const inTriangle = checks.inTriangle;
const doCross = checks.doCross;
const intersect = checks.intersect;
const onSegment = checks.onSegment;

const edges_module = @import("edges.zig");
const isDelaunay = edges_module.isDelaunay;
const isConvexQuad = edges_module.isConvexQuad;
const getVertex = edges_module.getVertex;
const isEdgeEqual = edges_module.isEdgeEqual;

const utils = @import("utils.zig");
const insertSquare = utils.insertSquare;
const insertOctagon = utils.insertOctagon;

const MemoryPool = @import("MemoryPool.zig").MemoryPool;
const StaticStack = @import("StaticStack.zig").StaticStack;
const StaticQueue = @import("StaticQueue.zig").StaticQueue;
const StaticRing = @import("StaticRing.zig").StaticRing;

const eps = 1e-10;
const STACK_LIMIT = 128;
const QUEUE_LIMIT = 256;
pub const CAPACITY = 16384;

pub const EdgeContext = MemoryPool(HalfEdge, CAPACITY);
pub const Stack = StaticStack(*HalfEdge, STACK_LIMIT);
pub const Queue = StaticQueue(*HalfEdge, QUEUE_LIMIT);
pub const Ring = StaticRing(*HalfEdge, QUEUE_LIMIT);

/// Use walk algorithm to find edge forming a triangle containing `p`.
pub fn locatePoint(p: Point, start: *HalfEdge) ?*HalfEdge {
    var current: *HalfEdge = start;
    var i: usize = 0;
    while (true) : (i += 1) {
        assert(i < CAPACITY);
        const a = current.origin;
        const b = current.next.?.origin;
        const c = current.next.?.next.?.origin;

        if (inTriangle(p, a, b, c)) return current;

        var nextEdge: ?*HalfEdge = null;
        inline for ([_]*HalfEdge{ current.next.?, current.next.?.next.? }) |edge| {
            const edgeA = edge.origin;
            const edgeB = edge.next.?.origin;
            const orientation = orient2D(edgeA, edgeB, p);

            if (orientation < 0) {
                if (edge.twin == null) return null;
                nextEdge = edge.twin.?;
                break;
            }
        }

        assert(nextEdge != null);
        current = nextEdge.?;
    }
}

/// Use walk algorithm to find all edges intersecting `e1`-`e2`.
pub fn getIntersecting(queue: *Queue, seed: *HalfEdge, e1: Point, e2: Point) !void {
    const in_triangle = locatePoint(e1, seed) orelse return error.E1NotInAnyTriangle;

    // Unless it's extremely degenerate case, it should never exceed 100 iterations.
    const LIMIT = 20;

    const start_edge: ?*HalfEdge = start_edge_search: {
        const start = getVertex(e1, in_triangle) orelse return error.E1NotAVertex;
        var current: *HalfEdge = start;
        var i: usize = 0;

        // Search CCW.
        while (i < LIMIT) : (i += 1) {
            inline for ([_]*HalfEdge{ current, current.next.?, current.next.?.next.? }) |edge| {
                const edgeA = edge.origin;
                const edgeB = edge.next.?.origin;
                if (intersect(edgeA, edgeB, e1, e2) != null) {
                    break :start_edge_search current;
                }
            }

            if (current.twin == null) break;
            current = current.twin.?.next.?;
            if (current == start) break;
        }

        // Continue CW.
        current = start;
        i = 0;
        while (i < LIMIT) : (i += 1) {
            inline for ([_]*HalfEdge{ current, current.next.?, current.next.?.next.? }) |edge| {
                const edgeA = edge.origin;
                const edgeB = edge.next.?.origin;
                if (intersect(edgeA, edgeB, e1, e2) != null) {
                    break :start_edge_search current;
                }
            }

            if (current.next.?.next.?.twin == null) break;
            current = current.next.?.next.?.twin.?;
            if (current == start) break;
        }

        break :start_edge_search null;
    };

    if (start_edge == null) return error.NoSuitableStartEdge;

    std.log.debug("start_edge = {}", .{start_edge.?});

    {
        var current: *HalfEdge = start_edge.?;
        var i: usize = 0;
        while (i < LIMIT) : (i += 1) {
            assert(i < LIMIT);

            inline for ([_]*HalfEdge{ current.next.?, current.next.?.next.? }) |edge| {
                const edgeA = edge.origin;
                const edgeB = edge.next.?.origin;
                const intersection = intersect(edgeA, edgeB, e1, e2);

                if (intersection != null) {
                    assert(edge.twin != null);
                    try queue.push(edge);

                    current = edge.twin.?;
                }
            }
        }
    }
}

test "getIntersecting" {
    const allocator = std.testing.allocator;
    var edges = try EdgeContext.init(allocator);
    defer edges.deinit();

    {
        try square(&edges, 100, 100);

        try insertPoint(&edges, P(40, 40));
        try insertPoint(&edges, P(60, 80));

        var queue = Queue{};
        const seed = locatePoint(P(100, 100), try edges.any()) orelse unreachable;
        try getIntersecting(&queue, seed, P(100, 100), P(0, 0));

        while (queue.pop()) |e| {
            std.debug.print("{}\n", .{e});
        }
    }

    {
        edges.reset();
        try square(&edges, 100, 100);

        try insertPoint(&edges, P(30, 40));
        try insertPoint(&edges, P(10, 70));
        try insertPoint(&edges, P(50, 50));
        try insertPoint(&edges, P(20, 45));

        try enforceEdge(&edges, P(30, 40), P(10, 70));
        try enforceEdge(&edges, P(10, 70), P(50, 50));

        var queue = Queue{};
        const e1 = P(50, 50);
        const e2 = P(20, 45);
        const e = locatePoint(e1, try edges.any()) orelse unreachable;
        const start = getVertex(e1, e).?;

        try getIntersecting(&queue, start, e1, e2);
        try expect(queue.size() == 1);
        try expect(eql(queue.values[0].origin, P(10, 70)));
        try expect(eql(queue.values[0].next.?.origin, P(30, 40)));
    }
}

/// Assuming empty mesh, initializes it with two triangles forming a rectangle
/// `(0, 0, width, height)`.
pub fn square(edges: *EdgeContext, width: f32, height: f32) !void {
    const a = P(0, 0);
    const b = P(width, 0);
    const c = P(width, height);
    const d = P(0, height);

    var ab = try edges.create(.{ .origin = a });
    var bc = try edges.create(.{ .origin = b });
    var ca = try edges.create(.{ .origin = c });
    ab.next = bc;
    bc.next = ca;
    ca.next = ab;

    var cd = try edges.create(.{ .origin = c });
    var da = try edges.create(.{ .origin = d });
    var ac = try edges.create(.{ .origin = a });
    cd.next = da;
    da.next = ac;
    ac.next = cd;

    ac.twin = ca;
    ca.twin = ac;
}

/// Insert point into triangulation. No-op if vertex already exists.
pub fn insertPoint(edges: *EdgeContext, p: Point) !void {
    const start = try edges.any();
    const t = locatePoint(p, start) orelse return error.EdgeNotFound;
    assert(t.next.?.next.?.next == t);

    if (getVertex(p, t)) |_| {
        // No-op.
    } else if (onSegment(p, t.origin, t.next.?.origin)) {
        try insertPointInEdge(edges, p, t);
    } else if (onSegment(p, t.next.?.origin, t.next.?.next.?.origin)) {
        try insertPointInEdge(edges, p, t.next.?);
    } else if (onSegment(p, t.next.?.next.?.origin, t.origin)) {
        try insertPointInEdge(edges, p, t.next.?.next.?);
    } else {
        try insertPointInFace(edges, p, t);
    }
}

/// Used by `insertPoint()`.
fn insertPointInEdge(edges: *EdgeContext, p: Point, e: *HalfEdge) !void {
    assert(e.next.?.next.?.next == e);
    var ac = e;
    var cd = e.next.?;
    const da = cd.next.?;

    var pd = try edges.create(.{ .origin = p });
    var dp = try edges.create(.{ .origin = da.origin });
    pd.twin = dp;
    dp.twin = pd;

    ac.next = pd; // AC becomes AP.
    pd.next = da;

    var pc = try edges.create(.{ .origin = p });
    pc.fixed = ac.fixed;
    pc.next = cd;
    dp.next = pc;
    cd.next = dp;

    var stack = Stack{};
    try stack.push(cd);
    try stack.push(da);

    if (e.twin) |pa| {
        pa.origin = p; // CA becomes PA.
        const ab = pa.next.?;

        var cp = try edges.create(.{ .origin = cd.origin });
        cp.fixed = pa.fixed;
        pc.twin = cp;
        cp.twin = pc;

        const bc = ab.next.?;

        var pb = try edges.create(.{ .origin = p });
        var bp = try edges.create(.{ .origin = bc.origin });

        pb.twin = bp;
        bp.twin = pb;

        ab.next = bp;
        bp.next = pa;

        cp.next = pb;
        pb.next = bc;
        bc.next = cp;

        try stack.push(ab);
        try stack.push(bc);
    }

    try flipEdges(&stack);
}

/// Used by `insertPoint()`.
fn insertPointInFace(edges: *EdgeContext, p: Point, e: *HalfEdge) !void {
    assert(e.next.?.next.?.next == e);
    const a = e.origin;
    const b = e.next.?.origin;
    const c = e.next.?.next.?.origin;

    var ab = e;
    var bc = e.next.?;
    var ca = e.next.?.next.?;

    var pa = try edges.create(.{ .origin = p });
    var ap = try edges.create(.{ .origin = a });
    pa.twin = ap;
    ap.twin = pa;
    pa.next = ab;

    var pb = try edges.create(.{ .origin = p });
    var bp = try edges.create(.{ .origin = b });
    pb.twin = bp;
    bp.twin = pb;
    pb.next = bc;

    var pc = try edges.create(.{ .origin = p });
    var cp = try edges.create(.{ .origin = c });
    pc.twin = cp;
    cp.twin = pc;
    pc.next = ca;

    ap.next = pc;
    bp.next = pa;
    cp.next = pb;

    ab.next = bp;
    bc.next = cp;
    ca.next = ap;

    var stack = Stack{};
    try stack.push(ab);
    try stack.push(bc);
    try stack.push(ca);

    try flipEdges(&stack);
}

/// If we draw a quad **ABCD** and assume `e` is **AC**, **AC** now becomes
/// **DB** and **CA** becomes **BD**.
pub fn flip(e: *HalfEdge) void {
    assert(e.twin != null);
    assert(!e.fixed and !e.twin.?.fixed);
    assert(isConvexQuad(e));

    const ac = e;
    const ca = e.twin.?;
    const ab = ca.next.?;
    const bc = ab.next.?;
    const cd = ac.next.?;
    const da = cd.next.?;

    // AC now becomes DB and CA becomes BD.
    ac.origin = da.origin;
    ca.origin = bc.origin;

    ac.next = bc;
    cd.next = ac;
    bc.next = cd;

    ca.next = da;
    ab.next = ca;
    da.next = ab;
}

test "flip" {
    var ab = HalfEdge{ .origin = P(0, 3) };
    var bc = HalfEdge{ .origin = P(3, 0) };
    var ca = HalfEdge{ .origin = P(5, 5) };
    ab.next = &bc;
    bc.next = &ca;
    ca.next = &ab;

    var ac = HalfEdge{ .origin = P(0, 3) };
    var cd = HalfEdge{ .origin = P(5, 5) };
    var da = HalfEdge{ .origin = P(1, 6) };
    ac.next = &cd;
    cd.next = &da;
    da.next = &ac;

    ac.twin = &ca;
    ca.twin = &ac;

    flip(&ac);
    try expect(ac.next.? == &bc);
}

/// Uses popular stack-based edge flipping to fix triangulation.
pub fn flipEdges(stack: *Stack) !void {
    while (stack.pop()) |e| {
        if (!e.fixed and e.twin != null and !isDelaunay(e)) {
            const f = e.twin.?;
            try stack.push(f.next.?);
            try stack.push(f.next.?.next.?);
            flip(e);
        }
    }
}

/// `e` is edge of a triangle that has `e1` as one of its vertices. If there
/// exists a direct edge `e1`-`e2`, return it.
pub fn findSharedEdge(e: *HalfEdge, e1: Point, e2: Point) ?*HalfEdge {
    const start = getVertex(e1, e).?;
    var current: *HalfEdge = start;

    // Unless it's extremely degenerate case, it should never exceed 100 iterations.
    const LIMIT = 100;
    var i: usize = 0;

    // Search CCW.
    while (i < LIMIT) : (i += 1) {
        const a = current.origin;
        const b = current.next.?.origin;
        if (eql(a, e1) and eql(b, e2)) return current;
        if (current.twin == null) break; // Reached boundary, switch to CW search.
        current = current.twin.?.next.?;
        if (current == start) break; // We completed a full loop.
    }

    // Continue CW.
    current = start;
    while (i < LIMIT) : (i += 1) {
        const a = current.origin;
        const b = current.next.?.origin;
        if (eql(a, e1) and eql(b, e2)) return current;
        if (current.next.?.next.?.twin == null) break; // Reached boundary, switch to CW search.
        current = current.next.?.next.?.twin.?;
        if (current == start) break; // We completed a full loop.
    }

    return null;
}

test "findSharedEdge" {
    const allocator = std.testing.allocator;
    var edges = try EdgeContext.init(allocator);
    defer edges.deinit();

    try square(&edges, 4, 4);
    try insertSquare(&edges, 0, 0, 1);
    try insertSquare(&edges, 1, 0, 1);

    // CCW search is sufficient.
    {
        const search = locatePoint(P(1, 0), try edges.any()) orelse unreachable;
        const shared = findSharedEdge(search, P(1, 0), P(2, 0)) orelse unreachable;
        try expect(eql(shared.origin, P(1, 0)));
        try expect(eql(shared.next.?.origin, P(2, 0)));
    }

    // Test situation in which we hit boundary and need to search CW.
    {
        const search = locatePoint(P(4, 4), try edges.any()) orelse unreachable;
        const shared = findSharedEdge(search, P(4, 4), P(2, 1)) orelse unreachable;
        try expect(eql(shared.origin, P(4, 4)));
        try expect(eql(shared.next.?.origin, P(2, 1)));
    }
}

fn markCrossing(e: *HalfEdge, e1: Point, e2: Point) void {
    const LIMIT = 100;
    var current: *HalfEdge = e;
    var i: usize = 0;

    // Search CCW.
    while (i < LIMIT) : (i += 1) {
        inline for ([_]*HalfEdge{ current, current.next.?, current.next.?.next.? }) |edge| {
            const edgeA = edge.origin;
            const edgeB = edge.next.?.origin;
            if (onSegment(edgeA, e1, e2) and onSegment(edgeB, e1, e2)) {
                edge.fixed = true;
                if (edge.twin) |tw| tw.fixed = true;
            }
        }

        if (current.twin == null) break;
        current = current.twin.?.next.?;
        if (current == e) break;
    }

    // Continue CW.
    current = e;
    i = 0;
    while (i < LIMIT) : (i += 1) {
        inline for ([_]*HalfEdge{ current, current.next.?, current.next.?.next.? }) |edge| {
            const edgeA = edge.origin;
            const edgeB = edge.next.?.origin;
            if (onSegment(edgeA, e1, e2) and onSegment(edgeB, e1, e2)) {
                edge.fixed = true;
                if (edge.twin) |tw| tw.fixed = true;
            }
        }

        if (current.next.?.next.?.twin == null) break;
        current = current.next.?.next.?.twin.?;
        if (current == e) break;
    }
}

pub fn enforceEdge(edges: *EdgeContext, e1: Point, e2: Point) !void {
    var intersecting = Queue{};
    const p = locatePoint(e1, try edges.any()) orelse return error.EdgeNotFound;

    // If edge already directly exists in triangulation.
    if (getVertex(e1, p)) |_| {
        if (findSharedEdge(p, e1, e2)) |shared| {
            shared.fixed = true;
            if (shared.twin) |tw| tw.fixed = true;
            return;
        }
    }

    try getIntersecting(&intersecting, p, e1, e2);

    while (intersecting.pop()) |e| {
        if (e.fixed) {
            const intersection = intersect(e1, e2, e.origin, e.next.?.origin) orelse unreachable;
            try insertPointInEdge(edges, intersection, e);
            markCrossing(e.next.?, e1, e2);
            continue;
        }

        if (!isConvexQuad(e)) {
            try intersecting.push(e);
            continue;
        }

        flip(e);

        if (onSegment(e.origin, e1, e2) and onSegment(e.next.?.origin, e1, e2)) {
            e.fixed = true;
            e.twin.?.fixed = true;
        }

        if (doCross(e1, e2, e.origin, e.next.?.origin)) {
            try intersecting.push(e);
        }
    }
}

test "enforceEdge" {
    const allocator = std.testing.allocator;
    var edges = try EdgeContext.init(allocator);
    defer edges.deinit();

    {
        try square(&edges, 100, 100);

        try insertSquare(&edges, 0, 0, 1);
        try insertSquare(&edges, 1, 0, 1);
    }
}

/// Boundary ring is CCW.
pub fn collectBoundary(edges: *EdgeContext, boundary: *Ring, p: Point) !void {
    const e = locatePoint(p, try edges.any()) orelse return error.EdgeNotFound;
    const start = getVertex(p, e) orelse return error.NotVertex;
    var current: ?*HalfEdge = start;

    std.log.debug("starting search in {}", .{start});

    // Unless it's extremely degenerate case, it should never need more iterations.
    const LIMIT = 128;
    var i: usize = 0;
    var continue_cw = false;
    var to_destroy = Stack{};

    // Search CCW.
    while (i < LIMIT) : (i += 1) {
        _ = try boundary.append(current.?.next.?);

        try to_destroy.push(current.?);
        try to_destroy.push(current.?.next.?.next.?);

        // Reached boundary, switch to CW search.
        if (current.?.next.?.next.?.twin == null) {
            _ = try boundary.append(current.?.next.?.next.?);
            continue_cw = true;
            break;
        }

        current = current.?.next.?.next.?.twin.?;
        if (current == start) break; // We completed a full loop.
    }

    if (continue_cw) {
        if (start.twin == null) _ = try boundary.prepend(start);

        current = start.twin;
        while (current != null) : (i += 1) {
            assert(i < LIMIT);
            _ = try boundary.prepend(current.?.next.?.next.?);

            try to_destroy.push(current.?);
            try to_destroy.push(current.?.next.?);

            // Reached boundary.
            if (current.?.next.?.twin == null) {
                _ = try boundary.prepend(current.?.next.?);
                break;
            }
            current = current.?.next.?.twin.?;
        }
    }

    // Only destroy edges with twins (no twin means it's boundary).
    while (to_destroy.pop()) |edge| {
        if (edge.twin) |_| {
            std.log.debug("destroying {}", .{edge});
            edges.destroy(edge);
        }
    }
}

test "collectBoundary" {
    const allocator = std.testing.allocator;

    // P(2, 1)
    {
        var edges = try EdgeContext.init(allocator);
        defer edges.deinit();
        try square(&edges, 4, 4);

        try insertSquare(&edges, 0, 0, 1);
        try insertSquare(&edges, 1, 0, 1);

        try expect(edges.count() == 27);

        var ring = Ring{};
        try collectBoundary(&edges, &ring, P(2, 1));

        try expect(edges.count() == 15);

        const expected = [_][2]Point{
            [_]Point{ P(0, 4), P(1, 1) },
            [_]Point{ P(4, 4), P(0, 4) },
            [_]Point{ P(4, 0), P(4, 4) },
            [_]Point{ P(2, 0), P(4, 0) },
            [_]Point{ P(1, 0), P(2, 0) },
            [_]Point{ P(1, 1), P(1, 0) },
        };
        var i: usize = 0;
        while (ring.pop()) |e| : (i += 1) {
            try expect(eql(e.origin, expected[i][0]));
            try expect(eql(e.next.?.origin, expected[i][1]));
        }
    }

    // P(2, 0)
    {
        var edges = try EdgeContext.init(allocator);
        defer edges.deinit();
        try square(&edges, 4, 4);

        try insertSquare(&edges, 0, 0, 1);
        try insertSquare(&edges, 1, 0, 1);
        var ring = Ring{};
        try collectBoundary(&edges, &ring, P(2, 0));

        try expect(edges.count() == 25);

        const expected = [_][2]Point{
            [_]Point{ P(1, 0), P(2, 0) },
            [_]Point{ P(2, 1), P(1, 0) },
            [_]Point{ P(4, 0), P(2, 1) },
            [_]Point{ P(2, 0), P(4, 0) },
        };

        var i: usize = 0;
        while (ring.pop()) |e| : (i += 1) {
            try expect(eql(e.origin, expected[i][0]));
            try expect(eql(e.next.?.origin, expected[i][1]));
        }
    }
}

/// Remove collinear points on the mesh boundary.
pub fn removeCollinear(edges: *EdgeContext, boundary: *Ring) !void {
    var a = boundary.first.?;
    var b = a.next.?;
    var c = b.next.?;
    while (true) {
        const is_on_boundary = a.value.twin == null and b.value.twin == null;
        const collinear = @abs(orient2D(a.value.origin, b.value.origin, c.value.origin)) <= eps;
        if (is_on_boundary and collinear) {
            std.log.debug("Removing collinear {}", .{b.value.origin});
            edges.destroy(b.value);
            a.value.next = c.value;
            boundary.remove(b);
        }

        a = a.next.?;
        b = a.next.?;
        c = b.next.?;

        if (a == boundary.first.?) break;
    }
}

pub fn fillCavity(edges: *EdgeContext, boundary: *Ring) !void {
    assert(boundary.size >= 3);
    var flip_stack = Stack{};
    var current = boundary.first;
    while (boundary.length() > 3) {
        const a = current.?;
        const b = current.?.next.?;
        const c = current.?.next.?.next.?;

        std.log.debug("forming △ A{} B{} C{}", .{ a.value.origin, b.value.origin, c.value.origin });

        const is_ear = is_ear: {
            const _a = a.value.origin;
            const _b = b.value.origin;
            const _c = c.value.origin;

            // Is CCW.
            if (orient2D(_a, _b, _c) <= 0) break :is_ear false;

            // Is any other point inside this triangle.
            var other = boundary.first;
            while (other) |node| {
                const p = node.value.origin;
                const is_other = !eql(p, _a) and !eql(p, _b) and !eql(p, _c);
                if (is_other and inTriangle(p, _a, _b, _c)) break :is_ear false;
                other = if (node.next == boundary.first) null else node.next;
            }

            break :is_ear true;
        };
        if (is_ear) {
            const ca = try edges.create(.{ .origin = c.value.origin });
            const ac = try edges.create(.{ .origin = a.value.origin });
            ca.twin = ac;
            ac.twin = ca;
            a.value.next = b.value;
            b.value.next = ca;
            ca.next = a.value;

            try flip_stack.push(a.value);
            try flip_stack.push(b.value);
            current = try boundary.insertAfter(b, ac);
            boundary.remove(a);
            boundary.remove(b);
        } else {
            current = current.?.next;
        }
    }

    // Handle the last triangle.
    {
        const a = boundary.first.?;
        const b = boundary.first.?.next.?;
        const c = boundary.first.?.next.?.next.?;
        a.value.next = b.value;
        b.value.next = c.value;
        c.value.next = a.value;

        std.log.debug("adding the last △ A{} B{} C{}", .{ a.value.origin, b.value.origin, c.value.origin });
    }

    try flipEdges(&flip_stack);
}

// TODO: don't allow corner points.
pub fn removePoint(edges: *EdgeContext, p: Point) !void {
    var ring = Ring{};
    try collectBoundary(edges, &ring, p);
    try removeCollinear(edges, &ring);
    try fillCavity(edges, &ring);
}

test "removePoint" {
    const allocator = std.testing.allocator;
    var edges = try EdgeContext.init(allocator);
    defer edges.deinit();

    // P(2, 1)
    {
        try square(&edges, 4, 4);
        defer edges.reset();
        try insertSquare(&edges, 0, 0, 1);
        try insertSquare(&edges, 1, 0, 1);

        try removePoint(&edges, P(2, 1));
        try expect(edges.count() == 18);

        // TODO: finish doing expects.
    }

    // Non-existing point.
    {
        try square(&edges, 4, 4);
        defer edges.reset();
        try insertSquare(&edges, 0, 0, 1);
        try insertSquare(&edges, 1, 0, 1);

        // Inside.
        try expectError(error.NotVertex, removePoint(&edges, P(3, 3)));

        // Outside.
        try expectError(error.EdgeNotFound, removePoint(&edges, P(-1, -1)));
    }
}

/// Validate if mesh is correct. Only use in debugging.
///
/// ### Checks for
/// - Each edge belongs to a triangle.
/// - If edge has a twin, that twin must consider the edge as its twin too.
///
/// ### DOESN'T check for
/// - Crossing edges.
pub fn validate(edges: *EdgeContext) !void {
    var success = true;
    var it = edges.iterator();
    while (it.next()) |e| {
        if (e.next.?.next.?.next.? != e) {
            std.log.debug("VALIDATION: {} does not form △!", .{e});
            success = false;
        }
        if (e.twin != null and e.twin.?.twin != e) {
            std.log.debug("VALIDATION: {} has a twin but that twin has different twin!", .{e});
            success = false;
        }
        if (e.twin != null and e.fixed and !e.twin.?.fixed) {
            std.log.debug("VALIDATION: {} is fixed but twin is not", .{e.origin});
        }
    }
    std.log.debug("Validation {s}.", .{if (success) "passed" else "failed"});
}
