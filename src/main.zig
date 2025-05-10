const std = @import("std");
const geometry = @import("geometry.zig");
const EdgeContext = geometry.EdgeContext;
const presets = @import("presets.zig");
const validate = geometry.validate;
const locatePoint = geometry.locatePoint;
const square = geometry.square;
const insertPoint = geometry.insertPoint;
const enforceEdge = geometry.enforceEdge;
const getVertex = geometry.getVertex;
const getIntersecting = geometry.getIntersecting;
const Queue = geometry.Queue;
const types = @import("types.zig");
const P = types.P;

/// Used for debugging with LLDB. For lib entry points see root.zig.
pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    var storage = try allocator.create(EdgeContext);
    defer allocator.destroy(storage);
    storage.* = try EdgeContext.init(allocator);
    defer storage.deinit();

    var t = try std.time.Timer.start();
    {
        try presets.selfIntersecting(storage);
    }
    std.debug.print("{}\n", .{std.fmt.fmtDuration(t.read())});

    try validate(storage);

    // {
    //     try square(storage, 100, 100);

    //     try insertPoint(storage, P(30, 40));
    //     try insertPoint(storage, P(10, 70));
    //     try insertPoint(storage, P(50, 50));
    //     try insertPoint(storage, P(20, 45));

    //     try enforceEdge(storage, P(30, 40), P(10, 70));
    //     try enforceEdge(storage, P(10, 70), P(50, 50));
    //     // try enforceEdge(storage, P(50, 50), P(20, 45));

    //     var queue = Queue{};
    //     const e1 = P(50, 50);
    //     const e2 = P(20, 45);
    //     const e = locatePoint(e1, try storage.any()) orelse unreachable;
    //     const start = getVertex(e1, e).?;

    //     std.debug.print("start: {}\n", .{start});
    //     try getIntersecting(&queue, start, e1, e2);

    //     std.debug.print("Queue size: {d}\n", .{queue.size()});
    //     for (0..queue.size()) |i| {
    //         std.debug.print("  {}\n", .{queue.values[i % queue.values.len]});
    //     }
    // }

}
