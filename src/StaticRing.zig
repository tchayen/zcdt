const std = @import("std");
const expect = std.testing.expect;
const expectEqual = std.testing.expectEqual;
const expectError = std.testing.expectError;

pub fn StaticRing(comptime T: type, capacity: usize) type {
    const BitSet = std.StaticBitSet(capacity);

    return struct {
        const Self = @This();

        const RingNode = struct {
            previous: ?*RingNode = null,
            next: ?*RingNode = null,
            value: T,
        };

        values: [capacity]RingNode = undefined,
        capacity: usize = capacity,
        first: ?*RingNode = null,
        last: ?*RingNode = null,
        free: BitSet = BitSet.initFull(),
        size: usize = 0,

        /// Appends an element to the end of the list.
        pub fn append(ring: *Self, value: T) !*RingNode {
            if (ring.size == capacity) return error.OutOfMemory;
            const index = ring.free.findFirstSet().?;
            ring.free.unset(index);

            const new_node = &ring.values[index];
            new_node.value = value;

            if (ring.size == 0) {
                new_node.previous = new_node;
                new_node.next = new_node;
                ring.first = new_node;
                ring.last = new_node;
            } else {
                new_node.previous = ring.last;
                new_node.next = ring.first;
                ring.last.?.next = new_node;
                ring.first.?.previous = new_node;
                ring.last = new_node;
            }

            ring.size += 1;
            return new_node;
        }

        /// Prepends an element to the start of the list.
        pub fn prepend(ring: *Self, value: T) !*RingNode {
            if (ring.size == capacity) return error.OutOfMemory;
            const index = ring.free.findFirstSet().?;
            ring.free.unset(index);

            const new_node = &ring.values[index];
            new_node.value = value;

            if (ring.size == 0) {
                new_node.previous = new_node;
                new_node.next = new_node;
                ring.first = new_node;
                ring.last = new_node;
            } else {
                new_node.next = ring.first;
                new_node.previous = ring.last;

                ring.first.?.previous = new_node;
                ring.last.?.next = new_node;
                ring.first = new_node;
            }
            ring.size += 1;
            return new_node;
        }

        /// Inserts an element after a given node.
        pub fn insertAfter(ring: *Self, node: *RingNode, value: T) !*RingNode {
            if (ring.size == capacity) return error.OutOfMemory;
            const index = ring.free.findFirstSet().?;
            ring.free.unset(index);

            const new_node = &ring.values[index];
            new_node.value = value;

            new_node.previous = node;
            new_node.next = node.next;

            if (node.next) |next_node| {
                next_node.previous = new_node;
            }
            node.next = new_node;

            if (node == ring.last.?) {
                ring.last = new_node;
                new_node.next = ring.first;
                ring.first.?.previous = new_node;
            }
            ring.size += 1;
            return new_node;
        }

        /// Removes a node from the list.
        pub fn remove(ring: *Self, node: *RingNode) void {
            if (ring.size == 0) return;
            if (ring.size == 1) {
                ring.first = null;
                ring.last = null;
            } else {
                if (node.previous) |prev_node| {
                    prev_node.next = node.next;
                }
                if (node.next) |next_node| {
                    next_node.previous = node.previous;
                }
                if (ring.first == node) {
                    ring.first = node.next;
                }
                if (ring.last == node) {
                    ring.last = node.previous;
                }
            }

            const index =
                (@intFromPtr(node) - @intFromPtr(&ring.values[0])) / @sizeOf(RingNode);
            ring.free.set(index);
            ring.size -= 1;
            ring.values[index].next = null;
            ring.values[index].previous = null;
        }

        /// Pops the last element from the list and returns its value.
        pub fn pop(ring: *Self) ?T {
            if (ring.size == 0) return null;
            const last_node = ring.last.?;
            const value = last_node.value;
            ring.remove(last_node);
            return value;
        }

        /// Pops the first element from the list and returns its value.
        pub fn popFirst(ring: *Self) ?T {
            if (ring.size == 0) return null;
            const first_node = ring.first.?;
            const value = first_node.value;
            ring.remove(first_node);
            return value;
        }

        /// Returns the number of elements in the list.
        pub fn length(ring: *Self) usize {
            return ring.size;
        }

        pub fn reset(ring: *Self) void {
            ring.free.setRangeValue(.{ .start = 0, .end = capacity }, true);
            ring.first = null;
            ring.last = null;
        }
    };
}

test "RingDoublyLinkedList" {
    const List = StaticRing(u32, 4);
    var list = List{};

    const n1 = try list.append(10);
    try expectEqual(n1.value, 10);

    try expectEqual(list.first, n1);
    try expectEqual(list.last, n1);

    const n2 = try list.append(20);
    const n3 = try list.prepend(5);
    const n4 = try list.append(30);

    try expectEqual(list.size, 4);
    try expectError(error.OutOfMemory, list.append(40));

    try expectEqual(list.first.?.previous, list.last);
    try expectEqual(list.last.?.next, list.first);

    try expectEqual(list.first, n3);
    try expectEqual(n3.next, n1);
    try expectEqual(n1.next, n2);
    try expectEqual(n2.next, n4);
    try expectEqual(n4.next, list.first);

    list.remove(n3);
    try expectEqual(list.size, 3);
    try expectEqual(list.first.?.value, 10);
    try expectEqual(list.first.?.previous, list.last);
    try expectEqual(list.last.?.next, list.first);
}
