const std = @import("std");
const assert = std.debug.assert;

pub fn StaticStack(comptime T: type, comptime capacity: usize) type {
    return struct {
        const Self = @This();
        values: [capacity]T = undefined,
        capacity: usize = capacity,
        size: usize = 0,

        pub fn push(stack: *Self, value: T) !void {
            if (stack.size == capacity) return error.OutOfMemory;
            stack.values[stack.size] = value;
            stack.size += 1;
        }

        pub fn pop(stack: *Self) ?T {
            if (stack.size == 0) return null;
            stack.size -= 1;
            return stack.values[stack.size];
        }
    };
}
