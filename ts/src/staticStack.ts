export class StaticStack {
  private readonly values: Int32Array;
  private top = 0;

  constructor(public readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError("StaticStack: capacity must be positive integer");
    }
    this.values = new Int32Array(capacity);
  }

  push(value: number): void {
    if (this.top === this.capacity) {
      throw new RangeError("StaticStack overflow");
    }
    this.values[this.top++] = value;
  }

  pop(): number | null {
    if (this.top === 0) return null;
    return this.values[--this.top] ?? null;
  }

  reset(): void {
    this.top = 0;
  }

  size(): number {
    return this.top;
  }
}
