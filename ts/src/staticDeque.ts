export class StaticDeque {
  private readonly values: Int32Array;
  private begin = 0;
  private end = 0;
  private length = 0;

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError("StaticDeque: capacity must be positive integer");
    }
    this.values = new Int32Array(capacity);
  }

  pushBack(value: number): void {
    if (this.length === this.capacity) {
      throw new RangeError("StaticDeque overflow");
    }
    this.values[this.end] = value;
    this.end = (this.end + 1) % this.capacity;
    this.length += 1;
  }

  popBack(): number | null {
    if (this.length === 0) return null;
    this.end = (this.end + this.capacity - 1) % this.capacity;
    const value = this.values[this.end];
    this.length -= 1;
    return value ?? null;
  }

  pushFront(value: number): void {
    if (this.length === this.capacity) {
      throw new RangeError("StaticDeque overflow");
    }
    this.begin = (this.begin + this.capacity - 1) % this.capacity;
    this.values[this.begin] = value;
    this.length += 1;
  }

  popFront(): number | null {
    if (this.length === 0) return null;
    const value = this.values[this.begin];
    this.begin = (this.begin + 1) % this.capacity;
    this.length -= 1;
    return value ?? null;
  }

  size(): number {
    return this.length;
  }

  isEmpty(): boolean {
    return this.length === 0;
  }

  isFull(): boolean {
    return this.length === this.capacity;
  }

  toArray(): Int32Array {
    const result = new Int32Array(this.length);
    for (let i = 0; i < this.length; i += 1) {
      const idx = (this.begin + i) % this.capacity;
      result[i] = this.values[idx]!;
    }
    this.begin = 0;
    this.end = this.length;
    this.values.set(result);
    return result;
  }
}
