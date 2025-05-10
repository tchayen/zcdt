const std = @import("std");
const builtin = @import("builtin");
const expect = std.testing.expect;
const Allocator = std.mem.Allocator;
const types = @import("types.zig");
const HalfEdge = types.HalfEdge;
const P = types.P;

/// Fixed memory pool with iterating allocated items. Uses dynamic bit sets.
pub fn MemoryPool(comptime T: type, comptime CAPACITY: comptime_int) type {
    return struct {
        const Self = @This();
        allocator: Allocator,
        items: []T,
        free: std.DynamicBitSet,
        capacity: usize = CAPACITY,

        pub fn init(allocator: Allocator) !Self {
            return Self{
                .allocator = allocator,
                .items = try allocator.alloc(T, CAPACITY),
                .free = try std.DynamicBitSet.initFull(allocator, CAPACITY),
            };
        }

        pub fn create(pool: *Self, value: T) !*T {
            const index = pool.free.findFirstSet() orelse return error.OutOfMemory;
            pool.free.unset(index);
            pool.items[index] = value;
            return &pool.items[index];
        }

        pub fn destroy(pool: *Self, e: *T) void {
            const index = @intFromPtr(e) - @intFromPtr(&pool.items[0]);
            pool.free.set(@intCast(index / @sizeOf(T)));
        }

        pub fn any(pool: *Self) !*T {
            var it = pool.iterator();
            return it.next() orelse error.Empty;
        }

        pub fn all(pool: *Self, allocator: Allocator) ![]T {
            var result = try std.ArrayList(T).initCapacity(allocator, pool.count());
            var it = pool.iterator();
            while (it.next()) |item| {
                try result.append(item.*);
            }
            return result.toOwnedSlice();
        }

        pub fn count(pool: *Self) usize {
            return CAPACITY - pool.free.count();
        }

        pub fn reset(pool: *Self) void {
            pool.free.setRangeValue(.{ .start = 0, .end = CAPACITY }, true);

            const z = std.mem.zeroes(HalfEdge);
            @memset(pool.items, z);
        }

        pub fn deinit(pool: *Self) void {
            pool.allocator.free(pool.items);
            pool.free.deinit();
        }

        const Iterator = struct {
            pool: *Self,
            index: usize,

            pub fn next(self: *Iterator) ?*T {
                while (self.index < CAPACITY) : (self.index += 1) {
                    if (!self.pool.free.isSet(self.index)) {
                        const item = &self.pool.items[self.index];
                        self.index += 1;
                        return item;
                    }
                }
                return null;
            }
        };

        pub fn iterator(pool: *Self) Iterator {
            return .{ .pool = pool, .index = 0 };
        }

        /// Returns capacity minus continuos block of free nodes in the back of the
        /// array. Or to put differently, size of used array.
        pub fn countUsed(pool: *Self) usize {
            var i: usize = CAPACITY - 1;
            while (i >= 0) : (i -= 1) {
                if (!pool.free.isSet(i)) {
                    return i + 1;
                }
            }
            return 0;
        }
    };
}

test "MemoryPool" {
    const allocator = std.testing.allocator;
    var ec = try MemoryPool(HalfEdge, 32).init(allocator);
    defer ec.deinit();

    const e1 = try ec.create(.{ .origin = P(0, 0) });
    _ = try ec.create(.{ .origin = P(10, 10) });
    ec.destroy(e1);

    const all = try ec.all(allocator);
    defer allocator.free(all);
    try expect(all.len == 1);

    try expect(ec.countUsed() == 2);
}
