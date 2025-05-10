const std = @import("std");

pub const Point = struct {
    x: f32,
    y: f32,

    pub fn format(p: Point, comptime _: []const u8, _: std.fmt.FormatOptions, writer: anytype) !void {
        try writer.print("({d}, {d})", .{ p.x, p.y });
    }
};

pub inline fn P(x: f32, y: f32) Point {
    return .{ .x = x, .y = y };
}

pub const HalfEdge = struct {
    origin: Point,
    twin: ?*HalfEdge = null,
    next: ?*HalfEdge = null,
    fixed: bool = false,

    pub fn format(e: HalfEdge, comptime _: []const u8, _: std.fmt.FormatOptions, writer: anytype) !void {
        try writer.print("[{}->{}]", .{ e.origin, if (e.next) |n| n.origin else P(-1, -1) });
    }
};
