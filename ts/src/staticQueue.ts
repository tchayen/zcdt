export class StaticQueue {
  private readonly values: Int32Array;
  private begin = 0;
  private end = 0;
  private length = 0;

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError("StaticQueue: capacity must be positive integer");
    }
    this.values = new Int32Array(capacity);
  }

  push(value: number): void {
    if (this.length === this.capacity) {
      throw new RangeError("StaticQueue overflow");
    }
    this.values[this.end] = value;
    this.end = (this.end + 1) % this.capacity;
    this.length += 1;
  }

  pop(): number | null {
    if (this.length === 0) return null;
    const value = this.values[this.begin];
    this.begin = (this.begin + 1) % this.capacity;
    this.length -= 1;
    return value ?? null;
  }

  size(): number {
    return this.length;
  }

  reset(): void {
    this.begin = 0;
    this.end = 0;
    this.length = 0;
  }
}
