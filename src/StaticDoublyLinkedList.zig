const std = @import("std");
const expect = std.testing.expect;
const expectEqual = std.testing.expectEqual;
const expectError = std.testing.expectError;

pub fn StaticDoublyLinkedList(comptime T: type, capacity: usize) type {
    const BitSet = std.StaticBitSet(capacity);

    return struct {
        const Self = @This();

        const ListNode = struct {
            previous: ?*ListNode = null,
            next: ?*ListNode = null,
            value: T,
        };

        values: [capacity]ListNode = undefined,
        capacity: usize = capacity,
        first: ?*ListNode = null,
        last: ?*ListNode = null,
        free: BitSet = BitSet.initFull(),
        size: usize = 0,

        pub fn append(list: *Self, value: T) !*ListNode {
            if (list.size == capacity) return error.OutOfMemory;

            const index = list.free.findFirstSet().?;
            list.free.unset(index);

            const new_node = &list.values[index];
            new_node.value = value;
            new_node.previous = list.last;
            new_node.next = null;

            if (list.last) |last| {
                last.next = new_node;
            } else {
                list.first = new_node;
            }
            list.last = new_node;

            list.size += 1;
            return new_node;
        }

        pub fn prepend(list: *Self, value: T) !*ListNode {
            if (list.size == capacity) return error.OutOfMemory;

            const index = list.free.findFirstSet().?;
            list.free.unset(index);

            const new_node = &list.values[index];
            new_node.value = value;
            new_node.previous = null;
            new_node.next = list.first;

            if (list.first) |first| {
                first.previous = new_node;
            } else {
                list.last = new_node;
            }
            list.first = new_node;

            list.size += 1;
            return new_node;
        }

        pub fn insertAfter(list: *Self, node: *ListNode, value: T) !*ListNode {
            if (list.size == capacity) return error.OutOfMemory;

            const index = list.free.findFirstSet().?;
            list.free.unset(index);

            const new_node = &list.values[index];
            new_node.value = value;
            new_node.previous = node;

            if (node.next) |next_node| {
                new_node.next = next_node;
                next_node.previous = new_node;
            } else {
                new_node.next = null;
                list.last = new_node;
            }
            node.next = new_node;

            list.size += 1;
            return new_node;
        }

        pub fn remove(list: *Self, node: *ListNode) void {
            if (node.previous) |prev_node| {
                prev_node.next = node.next;
            } else {
                list.first = node.next;
            }

            if (node.next) |next_node| {
                next_node.previous = node.previous;
            } else {
                list.last = node.previous;
            }

            const index = (@intFromPtr(node) - @intFromPtr(&list.values[0])) / @sizeOf(ListNode);
            list.free.set(index);
            list.size -= 1;
        }

        pub fn pop(list: *Self) ?T {
            if (list.last == null) return null;

            const last_node = list.last.?;
            const value = last_node.value;

            list.remove(last_node);
            return value;
        }

        pub fn popFirst(list: *Self) ?T {
            if (list.first == null) return null;

            const first_node = list.first.?;
            const value = first_node.value;

            list.remove(first_node);
            return value;
        }

        pub fn length(list: *Self) usize {
            return capacity - list.free.count();
        }
    };
}

test "StaticDoublyLinkedList" {
    const List = StaticDoublyLinkedList(u32, 4);
    var list = List{};
    const n1 = try list.append(10);
    const n2 = try list.append(20);
    const n3 = try list.prepend(5);
    const n4 = try list.append(30);

    try expect(list.size == 4);
    try expectError(error.OutOfMemory, list.append(40));

    try expectEqual(list.first, n3);
    try expectEqual(list.last, n4);
    try expectEqual(null, n4.next);
    try expectEqual(n2, n1.next.?);
    try expectEqual(n4, n2.next.?);
    try expectEqual(n1, n3.next.?);

    list.remove(n3);
    try expectEqual(n4, n2.next.?);
    try expectEqual(n2, n4.previous.?);

    try expectEqual(3, list.size);
}
