# zcdt

A library for dynamic CDT (constrained Delaunay triangulation) in Zig. Maintains a stateful triangulation system optimized around operations of adding vertices, removing vertices and enforcing edges to exist. Uses static memory allocation for maximum performance.

Based mostly on own research of computational geometry. I wrote a blog post about the process and origin of this library: [Handmade pathfinding mesh for games](https://tchayen.com/handmade-pathfinding-mesh-for-games). Final implementation similar to proposed by [Kallmann et al (2003)](https://infoscience.epfl.ch/server/api/core/bitstreams/7d6df859-c6df-42bd-935f-84f75380054b/content).

## Basics

The main type is **half-edge**. Why half? I store info about edge on the side of the half-edge. I could as well keep both sides and both origins. But that creates a problem with next. Half-edge naturally allows me to describe all triangles through chains of half-edges.

```zig
pub const HalfEdge = struct {
    origin: Point,
    twin: ?*HalfEdge = null,
    next: ?*HalfEdge = null,
    fixed: bool = false,
}
```

Each half-edge belongs to a triangle. Each triangle has all half-edges connected in a ring.

## Usage

Example usage.

```zig
var storage = try allocator.create(EdgeContext);
defer allocator.destroy(storage);
storage.* = try EdgeContext.init(allocator);
defer storage.deinit();

try square(storage, 100, 100);
try insertPoint(storage, P(40, 40));
try enforceEdge(storage, P(0, 0), P(40, 40));
try removePoint(storage, P(40, 40));
```

## API

### `square(edges: *EdgeContext, width: f32, height: f32) !void`

Initializes triangulation by creating two connected triangles.

### `insertPoint(edges: *EdgeContext, p: Point) !void`

Inserts point into triangulation. Must fall inside an existing triangle. Adding a point inside a triangle splits it into three. Adding point on an edge splits triangle(s) on side(s) into two. Adding point that already exists does nothing.

_Errors: `error.Empty`, `error.EdgeNotFound`, `error.OutOfMemory`._

### `enforceEdge(edges: *EdgeContext, e1: Point, e2: Point) !void`

Flips non-fixed edges until specified edge exists in the triangulation. Marks it as `fixed`. Both points must be previously added with `insertPoint()`.

_Errors: `error.EdgeNotFound`, `error.E1NotInAnyTriangle`, `error.E1NotAVertex`, `error.NoSuitableStartEdge`._

### `removePoint(edges: *EdgeContext, p: Point) !void`

Removes point previously inserted with `insertPoint()` from the triangulation.

_Errors: `error.EdgeNotFound`, `error.NotVertex`, `error.OutOfMemory`._
