const std = @import("std");
const builtin = @import("builtin");
const geometry = @import("geometry.zig");
const square = geometry.square;
const EdgeContext = geometry.EdgeContext;
const insertPoint = geometry.insertPoint;
const enforceEdge = geometry.enforceEdge;
const removePoint = geometry.removePoint;
const validate = geometry.validate;
const types = @import("types.zig");
const Point = types.Point;
const P = types.P;
const utils = @import("utils.zig");
const insertSquare = utils.insertSquare;
const insertOctagon = utils.insertOctagon;
const insertPolygon = utils.insertPolygon;

pub fn playground(edges: *EdgeContext) !void {
    edges.reset();
    try square(edges, 400, 400);

    try insertSquare(edges, 200, 320, 4);
    try insertSquare(edges, 208, 320, 4);
    try insertSquare(edges, 208, 324, 4);
    try insertSquare(edges, 170, 350, 8);
    try insertSquare(edges, 180, 354, 8);
    try insertSquare(edges, 160, 380, 8);
    try insertSquare(edges, 140, 328, 4);

    try insertSquare(edges, 360, 290, 8);
    try insertSquare(edges, 360, 300, 8);
    try insertSquare(edges, 350, 300, 8);

    try insertSquare(edges, 50, 27, 16);
    try insertSquare(edges, 336, 57, 16);
    try insertSquare(edges, 222, 367, 16);

    try insertOctagon(edges, 80, 30, 10);
    try insertOctagon(edges, 360, 60, 10);
    try insertOctagon(edges, 370, 150, 10);
    try insertOctagon(edges, 250, 370, 10);

    // River top.
    try insertPolygon(
        edges,
        &[_]Point{
            P(272, 0),
            P(286, 0),
            P(286, 56),
            P(272, 55),
        },
    );

    // River top second.
    try insertPolygon(
        edges,
        &[_]Point{
            P(270, 70),
            P(286, 70),
            P(289, 104),
            P(303, 126),
            P(314, 152),
            P(305, 190),
            P(290, 220),
            P(267, 251),
            P(251, 243),
            P(279, 203),
            P(291, 179),
            P(297, 149),
            P(283, 124),
            P(263, 120),
            P(230, 134),
            P(202, 142),
            P(196, 128),
            P(234, 118),
            P(258, 107),
            P(270, 92),
        },
    );

    // River middle.
    try insertPolygon(
        edges,
        &[_]Point{
            P(244, 258),
            P(258, 265),
            P(248, 282),
            P(248, 290),
            P(254, 299),
            P(262, 308),
            P(255, 318),
            P(236, 306),
            P(218, 300),
            P(188, 302),
            P(160, 310),
            P(133, 321),
            P(127, 307),
            P(155, 297),
            P(165, 284),
            P(161, 270),
            P(176, 264),
            P(183, 275),
            P(196, 284),
            P(222, 284),
            P(234, 277),
        },
    );

    // Left middle.
    try insertPolygon(
        edges,
        &[_]Point{
            P(183, 134),
            P(188, 147),
            P(173, 158),
            P(155, 181),
            P(155, 218),
            P(169, 251),
            P(155, 256),
            P(138, 221),
            P(139, 186),
            P(150, 160),
            P(165, 147),
        },
    );

    // Right.
    try insertPolygon(
        edges,
        &[_]Point{
            P(273, 314),
            P(290, 323),
            P(304, 334),
            P(320, 350),
            P(327, 371),
            P(327, 400),
            P(313, 400),
            P(313, 371),
            P(310, 360),
            P(297, 344),
            P(266, 325),
        },
    );

    // Left.
    try insertPolygon(
        edges,
        &[_]Point{
            P(113, 312),
            P(119, 327),
            P(100, 336),
            P(80, 343),
            P(60, 347),
            P(37, 350),
            P(0, 350),
            P(0, 333),
            P(37, 333),
            P(76, 326),
        },
    );
}

pub fn pointRemoval(edges: *EdgeContext) !void {
    edges.reset();
    try square(edges, 400, 400);

    // River middle.
    try insertPolygon(
        edges,
        &[_]Point{
            P(244, 258),
            P(258, 265),
            P(248, 282),
            P(248, 290),
            P(254, 299),
            P(262, 308),
            P(255, 318),
            P(236, 306),
            P(218, 300),
            P(188, 302),
            P(160, 310),
            P(133, 321),
            P(127, 307),
            P(155, 297),
            P(165, 284),
            P(161, 270),
            P(176, 264),
            P(183, 275),
            P(196, 284),
            P(222, 284),
            P(234, 277),
        },
    );

    // Left middle.
    try insertPolygon(
        edges,
        &[_]Point{
            P(183, 134),
            P(188, 147),
            P(173, 158),
            P(155, 181),
            P(155, 218),
            P(169, 251),
            P(155, 256),
            P(138, 221),
            P(139, 186),
            P(150, 160),
            P(165, 147),
        },
    );

    // Left.
    try insertPolygon(
        edges,
        &[_]Point{
            P(113, 312),
            P(119, 327),
            P(100, 336),
            P(80, 343),
            P(60, 347),
            P(37, 350),
            P(0, 350),
            P(0, 333),
            P(37, 333),
            P(76, 326),
        },
    );

    try removePoint(edges, P(113, 312));
    // try removePoint(edges, P(138, 221));
    // try removePoint(edges, P(155, 256));
    try removePoint(edges, P(0, 333));
}

pub fn selfIntersecting(edges: *EdgeContext) !void {
    edges.reset();
    try square(edges, 100, 100);

    {
        try insertPoint(edges, P(30, 40));
        try insertPoint(edges, P(10, 70));
        try insertPoint(edges, P(50, 50));
        try insertPoint(edges, P(20, 45));

        try enforceEdge(edges, P(30, 40), P(10, 70));
        try enforceEdge(edges, P(10, 70), P(50, 50));
        try enforceEdge(edges, P(50, 50), P(20, 45));

        try insertSquare(edges, 90, 0, 10);
        try insertSquare(edges, 20, 50, 30);
    }
}

pub fn grid(edges: *EdgeContext) !void {
    edges.reset();
    for (edges.items) |*e| {
        e.fixed = false;
    }
    try square(edges, 100, 100);

    const a = 50;
    for (0..a) |i| {
        for (0..a) |j| {
            const x: f32 = @floatFromInt(i);
            const y: f32 = @floatFromInt(j);

            try insertPoint(edges, P(x, y));
            try insertPoint(edges, P(x + 1, y));
            try insertPoint(edges, P(x + 1, y + 1));
            try insertPoint(edges, P(x, y + 1));

            try enforceEdge(edges, P(x, y), P(x + 1, y));
            try enforceEdge(edges, P(x + 1, y), P(x + 1, y + 1));
            try enforceEdge(edges, P(x + 1, y + 1), P(x, y + 1));
            try enforceEdge(edges, P(x, y + 1), P(x, y));
        }
    }
}

pub fn tinySquare(edges: *EdgeContext) !void {
    edges.reset();
    try square(edges, 4, 4);

    try insertSquare(edges, 0, 0, 1);
    try insertSquare(edges, 1, 0, 1);

    try removePoint(edges, P(0, 1));
}
