import { describe, expect, test } from "vitest";
import { StaticQueue } from "../src/StaticQueue";

describe("StaticQueue", () => {
  test("basic push/pop", () => {
    const queue = new StaticQueue(3);
    queue.push(1);
    queue.push(2);
    queue.push(3);
    expect(() => queue.push(4)).toThrow();

    expect(queue.pop()).toBe(1);
    expect(queue.pop()).toBe(2);
    expect(queue.pop()).toBe(3);
    expect(queue.pop()).toBeNull();
  });
});
