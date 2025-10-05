pub const MemoryPool = @import("MemoryPool.zig").MemoryPool;
const types = @import("types.zig");
pub const Point = types.Point;
pub const P = types.P;
pub const HalfEdge = types.HalfEdge;
const geometry = @import("geometry.zig");
const CAPACITY = geometry.CAPACITY;
pub const square = geometry.square;
pub const EdgeContext = geometry.EdgeContext;
pub const insertPoint = geometry.insertPoint;
pub const enforceEdge = geometry.enforceEdge;
pub const removePoint = geometry.removePoint;

// TODO: those don't really belong in the library.
const utils = @import("utils.zig");
const insertSquare = utils.insertSquare;
const insertOctagon = utils.insertOctagon;
const presets = @import("presets.zig");
