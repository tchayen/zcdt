import { nullthrows as nt } from "./nullthrows";

export class StaticRing {
  private readonly values: Int32Array;
  private readonly next: Int32Array;
  private readonly prev: Int32Array;
  private readonly inUse: Uint8Array;
  private readonly freeStack: Int32Array;
  private freeTop: number;

  private firstIndex = -1;
  private lastIndex = -1;
  size = 0;

  constructor(public readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError("StaticRing: capacity must be positive integer");
    }
    this.values = new Int32Array(capacity);
    this.next = new Int32Array(capacity).fill(-1);
    this.prev = new Int32Array(capacity).fill(-1);
    this.inUse = new Uint8Array(capacity);
    this.freeStack = new Int32Array(capacity);
    this.freeTop = capacity;
    for (let i = 0; i < capacity; i += 1) {
      this.freeStack[i] = capacity - 1 - i;
    }
  }

  private allocNode(): number {
    if (this.freeTop === 0) {
      throw new RangeError("StaticRing overflow");
    }
    const index = nt(this.freeStack[--this.freeTop]);
    this.inUse[index] = 1;
    this.next[index] = -1;
    this.prev[index] = -1;
    return index;
  }

  private freeNode(index: number): void {
    this.inUse[index] = 0;
    this.next[index] = -1;
    this.prev[index] = -1;
    this.freeStack[this.freeTop++] = index;
  }

  get first(): number {
    return this.firstIndex;
  }

  get last(): number {
    return this.lastIndex;
  }

  append(value: number): number {
    const index = this.allocNode();
    this.values[index] = value;

    if (this.size === 0) {
      this.next[index] = index;
      this.prev[index] = index;
      this.firstIndex = index;
      this.lastIndex = index;
    } else {
      const last = this.lastIndex;
      const first = this.firstIndex;
      this.next[last] = index;
      this.prev[index] = last;
      this.next[index] = first;
      this.prev[first] = index;
      this.lastIndex = index;
    }

    this.size += 1;
    return index;
  }

  prepend(value: number): number {
    const index = this.allocNode();
    this.values[index] = value;

    if (this.size === 0) {
      this.next[index] = index;
      this.prev[index] = index;
      this.firstIndex = index;
      this.lastIndex = index;
    } else {
      const first = this.firstIndex;
      const last = this.lastIndex;
      this.prev[first] = index;
      this.next[index] = first;
      this.prev[index] = last;
      this.next[last] = index;
      this.firstIndex = index;
    }

    this.size += 1;
    return index;
  }

  insertAfter(nodeIndex: number, value: number): number {
    const index = this.allocNode();
    this.values[index] = value;

    const nextIndex = nt(this.next[nodeIndex]);
    this.next[nodeIndex] = index;
    this.prev[index] = nodeIndex;
    this.next[index] = nextIndex;
    this.prev[nextIndex] = index;

    if (nodeIndex === this.lastIndex) {
      this.lastIndex = index;
    }

    this.size += 1;
    return index;
  }

  remove(nodeIndex: number): void {
    if (this.size === 1) {
      this.firstIndex = -1;
      this.lastIndex = -1;
      this.freeNode(nodeIndex);
      this.size = 0;
      return;
    }

    const prevIndex = nt(this.prev[nodeIndex]);
    const nextIndex = nt(this.next[nodeIndex]);

    this.next[prevIndex] = nextIndex;
    this.prev[nextIndex] = prevIndex;

    if (nodeIndex === this.firstIndex) {
      this.firstIndex = nextIndex;
    }
    if (nodeIndex === this.lastIndex) {
      this.lastIndex = prevIndex;
    }

    this.freeNode(nodeIndex);
    this.size -= 1;
  }

  pop(): number | null {
    if (this.size === 0) return null;
    const value = this.values[this.lastIndex];
    this.remove(this.lastIndex);
    return value ?? null;
  }

  popFirst(): number | null {
    if (this.size === 0) return null;
    const value = this.values[this.firstIndex];
    this.remove(this.firstIndex);
    return value ?? null;
  }

  length(): number {
    return this.size;
  }

  valueOf(index: number): number {
    return this.values[index]!;
  }

  nextOf(index: number): number {
    return this.next[index]!;
  }

  prevOf(index: number): number {
    return this.prev[index]!;
  }

  reset(): void {
    this.size = 0;
    this.firstIndex = -1;
    this.lastIndex = -1;
    for (let i = 0; i < this.values.length; i += 1) {
      if (this.inUse[i]) {
        this.inUse[i] = 0;
        this.next[i] = -1;
        this.prev[i] = -1;
      }
      this.freeStack[i] = this.values.length - 1 - i;
    }
    this.freeTop = this.values.length;
  }
}
