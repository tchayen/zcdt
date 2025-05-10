const std = @import("std");

pub fn StaticQueue(comptime T: type, comptime capacity: usize) type {
    return struct {
        const Self = @This();
        values: [capacity]T = undefined,
        capacity: usize = capacity,
        begin: usize = 0,
        end: usize = 0,

        pub fn push(queue: *Self, value: T) !void {
            if (queue.size() == capacity) {
                return error.OutOfMemory;
            }
            queue.values[queue.end] = value;
            queue.end = (queue.end + 1) % capacity;
        }

        pub fn pop(queue: *Self) ?T {
            if (queue.size() == 0) {
                return null;
            }
            const value = queue.values[queue.begin];
            queue.begin = (queue.begin + 1) % capacity;
            return value;
        }

        pub fn size(queue: *Self) usize {
            return (queue.end + capacity - queue.begin) % capacity;
        }
    };
}
