# Zig-to-TypeScript Translation Strategy

## General Goals
- Preserve cache-friendly, low-allocation behaviour by representing half-edges and points in tightly packed typed arrays.
- Replace pointer semantics with integer indices; keep critical loops branch-light and avoid JS objects in hot paths.
- Keep data structures fixed-capacity, mirroring Zig's `CAPACITY` constants to avoid growth checks and re-allocations.
- Ensure functions remain pure/inline where possible; expose small helper functions but mark internal ones for manual inlining if necessary.

## Core Data Model
- `Point` will be a lightweight `{ x: number, y: number }` where copies are rare; in hot loops we will read straight from `Float32Array`s.
- `HalfEdgePool` mirrors `MemoryPool(HalfEdge, CAPACITY)`:
  - Structure-of-arrays layout: `originX`, `originY` (`Float32Array`), `next`, `twin` (`Int32Array` with `-1` sentinel), `fixed` (`Uint8Array`).
  - Free slots managed via an `Int32Array` stack to achieve O(1) allocate/free.
  - Iteration through a compact `usedFlags` bitset (`Uint32Array`) to keep parity with Zig's `DynamicBitSet`.
  - Methods: `create`, `destroy`, `any`, `iterator`, `count`, `countUsed`, `reset`.

## Supporting Containers
- `StaticStack`, `StaticQueue`, `StaticDeque`, `StaticRing`, `StaticDoublyLinkedList` become fixed-size typed-array-backed structures.
  - Use `Int32Array`/`Float32Array` when holding indices, plain arrays only for debug/test utilities.
  - Provide identical APIs (`push`, `pop`, etc.) with explicit bounds checks raising `RangeError` to surface logical bugs.

## Geometric Predicates (`checks.zig`)
- Functions (`orient2D`, `inCircle`, `doCross`, `intersect`, `onSegment`, `inTriangle`) port directly with `number` maths. Preserve `eps = 1e-10` constant.
- Keep tests 1:1 via Vitest.

## Half-Edge Algorithms (`geometry.zig`)
- Translate each core routine carefully, replacing pointer traversal with index-based loops relying on pool arrays.
- `locatePoint`, `getIntersecting`, `insertPoint`, `flipEdges`, `findSharedEdge`, `collectBoundary`, etc. will rely on helper accessors:
  - `nextIndex(edgeIdx)`, `twinIndex(edgeIdx)`, `setNext(edgeIdx, value)`.
  - Inline small helpers to minimise call overhead.
- Maintain stacks/queues as in Zig to control iteration limits; mirror `assert` logic with debug checks and throw errors when invariants break.
- Use exhaustive unit tests from Zig to confirm correctness. Tests will set up small triangulations and compare indices/coordinates.

## Utilities (`utils.zig`, `presets.zig`)
- Port convenience routines after core geometry is verified.
- Adapt tests that rely on Zig's `std.testing` to Vitest expectations; compare floats with tolerance where necessary.

## Performance Notes
- No dynamic allocations inside hot routines; use pre-sized work stacks/queues passed by reference.
- Rely on manual loops and plain `for` `while` constructs; avoid high-order array methods.
- Where Zig uses `inline`, we keep helper functions local within module scopes for inlining by JS engines.
- Consider exposing typed-data views for debugging/export similar to `exportPacked`.

## Testing Plan
- Mirror Zig tests module-by-module.
- Begin with predicate + container tests to ensure the foundation is solid.
- Progress to incremental integration tests: insertions, flips, enforcing edges.
- Use deterministic inputs identical to Zig fixtures for comparisons.
