import { describe, expect, test } from "vitest";
import { StaticDoublyLinkedList } from "../src/staticDoublyLinkedList";

describe("StaticDoublyLinkedList", () => {
  test("operations", () => {
    const list = new StaticDoublyLinkedList(4);
    const n1 = list.append(10);
    const n2 = list.append(20);
    const n3 = list.prepend(5);
    const n4 = list.append(30);

    expect(list.size).toBe(4);
    expect(() => list.append(40)).toThrow();

    expect(list.first).toBe(n3);
    expect(list.last).toBe(n4);
    expect(list.nextOf(n3)).toBe(n1);
    expect(list.nextOf(n1)).toBe(n2);
    expect(list.nextOf(n2)).toBe(n4);
    expect(list.nextOf(n4)).toBe(-1);

    list.remove(n3);
    expect(list.size).toBe(3);
    expect(list.first).toBe(n1);
    expect(list.prevOf(n1)).toBe(-1);
    expect(list.prevOf(n2)).toBe(n1);
    expect(list.nextOf(n2)).toBe(n4);
    expect(list.last).toBe(n4);
  });
});
