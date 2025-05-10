const std = @import("std");

pub fn StaticDeque(comptime T: type, comptime capacity: usize) type {
    return struct {
        const Self = @This();
        values: [capacity]T = undefined,
        capacity: usize = capacity,
        begin: usize = 0,
        end: usize = 0,

        pub fn pushBack(deque: *Self, value: T) !void {
            if (deque.size() == capacity) {
                return error.OutOfMemory;
            }
            deque.values[deque.end] = value;
            deque.end = (deque.end + 1) % capacity;
        }

        pub fn popBack(deque: *Self) ?T {
            if (deque.size() == 0) {
                return null;
            }
            deque.end = (deque.end + capacity - 1) % capacity;
            return deque.values[deque.end];
        }

        pub fn pushFront(deque: *Self, value: T) !void {
            if (deque.size() == capacity) {
                return error.OutOfMemory;
            }
            deque.begin = (deque.begin + capacity - 1) % capacity;
            deque.values[deque.begin] = value;
        }

        pub fn popFront(deque: *Self) ?T {
            if (deque.size() == 0) {
                return null;
            }
            const value = deque.values[deque.begin];
            deque.begin = (deque.begin + 1) % capacity;
            return value;
        }

        pub fn size(deque: *Self) usize {
            return (deque.end + capacity - deque.begin) % capacity;
        }

        pub fn isEmpty(deque: *Self) bool {
            return deque.size() == 0;
        }

        pub fn isFull(deque: *Self) bool {
            return deque.size() == capacity;
        }

        pub fn toSlice(deque: *Self) []T {
            if (deque.size() == 0) {
                return deque.values[0..0];
            }

            var temp: [capacity]T = undefined;

            var index: usize = 0;
            var current = deque.begin;
            while (index < deque.size()) : (index += 1) {
                temp[index] = deque.values[current];
                current = (current + 1) % capacity;
            }

            @memcpy(deque.values[0..deque.size()], temp[0..deque.size()]);

            deque.begin = 0;
            deque.end = deque.size();

            return deque.values[0..deque.size()];
        }
    };
}
