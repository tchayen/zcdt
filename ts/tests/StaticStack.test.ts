import { describe, expect, test } from "vitest";
import { StaticStack } from "../src/StaticStack";

describe("StaticStack", () => {
  test("basic push/pop", () => {
    const stack = new StaticStack(4);
    stack.push(10);
    stack.push(20);
    stack.push(30);
    stack.push(40);
    expect(() => stack.push(50)).toThrow();

    expect(stack.pop()).toBe(40);
    expect(stack.pop()).toBe(30);
    expect(stack.pop()).toBe(20);
    expect(stack.pop()).toBe(10);
    expect(stack.pop()).toBeNull();
  });
});
