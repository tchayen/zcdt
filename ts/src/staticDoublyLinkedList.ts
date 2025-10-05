import { nullthrows as nt } from "./nullthrows";

export class StaticDoublyLinkedList {
  private readonly values: Int32Array;
  private readonly next: Int32Array;
  private readonly prev: Int32Array;
  private readonly inUse: Uint8Array;
  private readonly freeStack: Int32Array;
  private freeTop: number;

  private firstIndex = -1;
  private lastIndex = -1;
  size = 0;

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError(
        "StaticDoublyLinkedList: capacity must be positive integer",
      );
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
      throw new RangeError("StaticDoublyLinkedList overflow");
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

    if (this.lastIndex !== -1) {
      this.next[this.lastIndex] = index;
      this.prev[index] = this.lastIndex;
    } else {
      this.firstIndex = index;
    }

    this.lastIndex = index;
    this.size += 1;
    return index;
  }

  prepend(value: number): number {
    const index = this.allocNode();
    this.values[index] = value;

    if (this.firstIndex !== -1) {
      this.prev[this.firstIndex] = index;
      this.next[index] = this.firstIndex;
    } else {
      this.lastIndex = index;
    }

    this.firstIndex = index;
    this.size += 1;
    return index;
  }

  insertAfter(nodeIndex: number, value: number): number {
    this.assertInUse(nodeIndex);

    const index = this.allocNode();
    this.values[index] = value;

    const nextIndex = nt(this.next[nodeIndex]);
    this.next[nodeIndex] = index;
    this.prev[index] = nodeIndex;

    if (nextIndex !== -1) {
      this.prev[nextIndex] = index!;
      this.next[index] = nextIndex;
    } else {
      this.lastIndex = index;
    }

    this.size += 1;
    return index;
  }

  remove(nodeIndex: number): void {
    this.assertInUse(nodeIndex);

    const prevIndex = nt(this.prev[nodeIndex]);
    const nextIndex = nt(this.next[nodeIndex]);

    if (prevIndex !== -1) {
      this.next[prevIndex] = nextIndex!;
    } else {
      this.firstIndex = nextIndex;
    }

    if (nextIndex !== -1) {
      this.prev[nextIndex] = prevIndex!;
    } else {
      this.lastIndex = prevIndex;
    }

    this.freeNode(nodeIndex);
    this.size -= 1;
  }

  pop(): number | null {
    if (this.lastIndex === -1) return null;
    const value = this.values[this.lastIndex];
    this.remove(this.lastIndex);
    return value ?? null;
  }

  popFirst(): number | null {
    if (this.firstIndex === -1) return null;
    const value = this.values[this.firstIndex];
    this.remove(this.firstIndex);
    return value ?? null;
  }

  length(): number {
    return this.size;
  }

  valueOf(index: number): number {
    this.assertInUse(index);
    return this.values[index]!;
  }

  nextOf(index: number): number {
    this.assertInUse(index);
    return this.next[index]!;
  }

  prevOf(index: number): number {
    this.assertInUse(index);
    return this.prev[index]!;
  }

  private assertInUse(index: number): void {
    if (index < 0 || index >= this.capacity || this.inUse[index] === 0) {
      throw new RangeError("StaticDoublyLinkedList: invalid node");
    }
  }
}
