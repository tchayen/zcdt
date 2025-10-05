import type { Point } from "./types";
import { nullthrows as nt } from "./nullthrows";
import { CAPACITY } from "./constants";

export interface HalfEdgeInit {
  x: number;
  y: number;
  next?: number;
  twin?: number;
  fixed?: boolean;
}

export class EdgeContext {
  readonly originX: Float32Array;
  readonly originY: Float32Array;
  readonly next: Int32Array;
  readonly twin: Int32Array;
  readonly fixed: Uint8Array;
  readonly inUse: Uint8Array;
  private readonly freeStack: Int32Array;
  private freeTop: number;
  private allocated = 0;
  private maxUsedIndex = -1;

  constructor(private readonly capacity: number = CAPACITY) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError("EdgeContext: capacity must be positive integer");
    }
    this.originX = new Float32Array(capacity);
    this.originY = new Float32Array(capacity);
    this.next = new Int32Array(capacity).fill(-1);
    this.twin = new Int32Array(capacity).fill(-1);
    this.fixed = new Uint8Array(capacity);
    this.inUse = new Uint8Array(capacity);
    this.freeStack = new Int32Array(capacity);
    this.freeTop = capacity;
    for (let i = 0; i < capacity; i += 1) {
      this.freeStack[i] = capacity - 1 - i;
    }
  }

  create(init: HalfEdgeInit): number {
    if (this.freeTop === 0) {
      throw new RangeError("EdgeContext: out of memory");
    }
    const index = nt(this.freeStack[--this.freeTop]);
    this.inUse[index] = 1;
    this.originX[index] = init.x;
    this.originY[index] = init.y;
    this.next[index] = init.next ?? -1;
    this.twin[index] = init.twin ?? -1;
    this.fixed[index] = init.fixed ? 1 : 0;
    this.allocated += 1;
    if (index > this.maxUsedIndex) {
      this.maxUsedIndex = index;
    }
    return index;
  }

  destroy(index: number): void {
    this.inUse[index] = 0;
    this.fixed[index] = 0;
    this.next[index] = -1;
    this.twin[index] = -1;
    this.freeStack[this.freeTop++] = index;
    this.allocated -= 1;
    if (index === this.maxUsedIndex) {
      this.recomputeMaxUsedIndex();
    }
  }

  reset(): void {
    this.allocated = 0;
    this.maxUsedIndex = -1;
    for (let i = 0; i < this.capacity; i += 1) {
      this.inUse[i] = 0;
      this.fixed[i] = 0;
      this.next[i] = -1;
      this.twin[i] = -1;
      this.originX[i] = 0;
      this.originY[i] = 0;
      this.freeStack[i] = this.capacity - 1 - i;
    }
    this.freeTop = this.capacity;
  }

  any(): number {
    for (let i = 0; i <= this.maxUsedIndex; i += 1) {
      if (this.inUse[i]) {
        return i;
      }
    }
    throw new RangeError("EdgeContext: empty");
  }

  iterator(): Iterable<number> {
    const ctx = this;
    return {
      *[Symbol.iterator]() {
        for (let i = 0; i <= ctx.maxUsedIndex; i += 1) {
          if (ctx.inUse[i]) {
            yield i;
          }
        }
      },
    };
  }

  count(): number {
    return this.allocated;
  }

  countUsed(): number {
    return this.maxUsedIndex + 1;
  }

  setOrigin(index: number, point: Point): void {
    this.originX[index] = point.x;
    this.originY[index] = point.y;
  }

  origin(index: number): Point {
    return { x: this.originX[index]!, y: this.originY[index]! };
  }

  originXAt(index: number): number {
    return this.originX[index]!;
  }

  originYAt(index: number): number {
    return this.originY[index]!;
  }

  setNext(index: number, nextIndex: number): void {
    this.next[index] = nextIndex;
  }

  getNext(index: number): number {
    return this.next[index]!;
  }

  setTwin(index: number, twinIndex: number): void {
    this.twin[index] = twinIndex;
  }

  getTwin(index: number): number {
    return this.twin[index]!;
  }

  isFixed(index: number): boolean {
    return this.fixed[index] === 1;
  }

  setFixed(index: number, value: boolean): void {
    this.fixed[index] = value ? 1 : 0;
  }

  private recomputeMaxUsedIndex(): void {
    for (let i = this.maxUsedIndex - 1; i >= 0; i -= 1) {
      if (this.inUse[i]) {
        this.maxUsedIndex = i;
        return;
      }
    }
    this.maxUsedIndex = -1;
  }

  getCapacity(): number {
    return this.capacity;
  }

  isInUse(index: number): boolean {
    return index >= 0 && index < this.capacity && this.inUse[index] === 1;
  }
}
