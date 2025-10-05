import { describe, expect, test } from "vitest";
import { StaticDeque } from "../src/StaticDeque";

describe("StaticDeque", () => {
  test("push/pop front/back", () => {
    const deque = new StaticDeque(4);
    deque.pushBack(10);
    deque.pushBack(20);
    deque.pushFront(5);
    deque.pushBack(30);
    expect(() => deque.pushBack(40)).toThrow();

    expect(deque.size()).toBe(4);
    expect(deque.isFull()).toBe(true);

    expect(deque.popFront()).toBe(5);
    expect(deque.popBack()).toBe(30);
    expect(deque.popFront()).toBe(10);
    expect(deque.popBack()).toBe(20);
    expect(deque.isEmpty()).toBe(true);
  });

  test("toArray reorders storage", () => {
    const deque = new StaticDeque(4);
    deque.pushBack(1);
    deque.pushBack(2);
    deque.pushBack(3);
    deque.popFront();
    deque.pushBack(4);

    const arr = deque.toArray();
    expect(Array.from(arr)).toStrictEqual([2, 3, 4]);
    expect(deque.size()).toBe(3);
  });
});
