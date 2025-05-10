const types = @import("types.zig");
const Point = types.Point;
const P = types.P;
const geometry = @import("geometry.zig");
const EdgeContext = geometry.EdgeContext;
const insertPoint = geometry.insertPoint;
const enforceEdge = geometry.enforceEdge;

pub fn insertSquare(edges: *EdgeContext, x: f32, y: f32, size: f32) !void {
    try insertPoint(edges, P(x, y));
    try insertPoint(edges, P(x + size, y));
    try insertPoint(edges, P(x + size, y + size));
    try insertPoint(edges, P(x, y + size));

    try enforceEdge(edges, P(x, y), P(x + size, y));
    try enforceEdge(edges, P(x + size, y), P(x + size, y + size));
    try enforceEdge(edges, P(x + size, y + size), P(x, y + size));
    try enforceEdge(edges, P(x, y + size), P(x, y));
}

pub fn insertOctagon(edges: *EdgeContext, x: f32, y: f32, size: f32) !void {
    const sqrt2 = @sqrt(2.0);
    const a = size / (sqrt2 + 1);
    var points = [_]Point{
        P(a / sqrt2, 0),
        P(a + a / sqrt2, 0),
        P(size, a / sqrt2),
        P(size, a / sqrt2 + a),
        P(a + a / sqrt2, size),
        P(a / sqrt2, size),
        P(0, a / sqrt2 + a),
        P(0, a / sqrt2),
    };

    for (&points) |*p| p.* = P(p.x + x, p.y + y);
    for (points) |p| try insertPoint(edges, p);
    for (0..points.len) |i| try enforceEdge(edges, points[i], points[(i + 1) % points.len]);
}

pub fn insertPolygon(edges: *EdgeContext, points: []const Point) !void {
    for (points) |p| try insertPoint(edges, p);
    for (0..points.len) |i| try enforceEdge(edges, points[i], points[(i + 1) % points.len]);
}
