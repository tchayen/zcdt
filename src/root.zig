const std = @import("std");
const MemoryPool = @import("MemoryPool.zig").MemoryPool;
const types = @import("types.zig");
const Point = types.Point;
const P = types.P;
const HalfEdge = types.HalfEdge;
const geometry = @import("geometry.zig");
const CAPACITY = geometry.CAPACITY;
const square = geometry.square;
const EdgeContext = geometry.EdgeContext;
const insertPoint = geometry.insertPoint;
const enforceEdge = geometry.enforceEdge;
const removePoint = geometry.removePoint;
const utils = @import("utils.zig");
const insertSquare = utils.insertSquare;
const insertOctagon = utils.insertOctagon;
const presets = @import("presets.zig");

var storage: *EdgeContext = undefined;
const allocator = std.heap.page_allocator;

const SelectedMap = enum(i32) {
    rts_map = 0,
    grid_benchmark = 1,
    self_intersecting = 2,
};

var map: SelectedMap = .rts_map;

export fn init() void {
    storage = allocator.create(EdgeContext) catch unreachable;
    storage.* = EdgeContext.init(allocator) catch unreachable;

    run() catch unreachable;
}

fn run() !void {
    switch (map) {
        .rts_map => try presets.playground(storage),
        .grid_benchmark => try presets.grid(storage),
        .self_intersecting => try presets.selfIntersecting(storage),
    }
}

test {
    storage = try allocator.create(EdgeContext);
    storage.* = try EdgeContext.init(allocator);
    try square(storage, 100, 100);
    try insertPoint(storage, P(40, 40));

    try insertPoint(storage, P(60, 80));
    try insertPoint(storage, P(65, 80));
    try insertPoint(storage, P(65, 85));
    try insertPoint(storage, P(60, 85));

    try insertPoint(storage, P(80, 70));

    try insertPoint(storage, P(50, 15));
    try insertPoint(storage, P(95, 15));
    try insertPoint(storage, P(95, 30));
    try insertPoint(storage, P(90, 30));
    try insertPoint(storage, P(90, 20));
    try insertPoint(storage, P(50, 20));

    try enforceEdge(storage, P(50, 15), P(95, 15));
}

const ExportHalfEdge = extern struct {
    x: f32 = 0,
    y: f32 = 0,
    next: u32 = 0,
    twin: u32 = 0,
    fixed: bool = false,
};

export fn setSelectedMap(i: i32) void {
    map = @enumFromInt(i);
    run() catch unreachable;
}

var exported: [CAPACITY]ExportHalfEdge = undefined;

inline fn pointerToInt(e: ?*HalfEdge) u32 {
    return @intCast((@intFromPtr(e) - @intFromPtr(&storage.items[0])) / @sizeOf(HalfEdge));
}

export fn exportPacked() void {
    @memset(&exported, .{});

    const size = storage.countUsed();

    for (0..size) |i| {
        const value = &storage.items[i];
        const max = std.math.maxInt(u32);
        if (!storage.free.isSet(i)) {
            exported[i] = .{
                .x = value.origin.x,
                .y = value.origin.y,
                .next = pointerToInt(value.next),
                .twin = if (value.twin) |_| pointerToInt(value.twin) else max,
                .fixed = value.fixed,
            };
        } else {
            exported[i] = .{
                .x = max,
                .y = max,
                .next = max,
                .twin = max,
                .fixed = false,
            };
        }
    }
}

export fn ptr() [*]u8 {
    return @ptrCast(&exported);
}

export fn len() usize {
    return CAPACITY * @sizeOf(ExportHalfEdge);
}
