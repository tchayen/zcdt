import { P } from "./types";
import { EdgeContext } from "./EdgeContext";
import { square, insertPoint, enforceEdge, removePoint } from "./geometry";
import { insertSquare, insertOctagon, insertPolygon } from "./utils";

export function playground(edges: EdgeContext): void {
  edges.reset();
  square(edges, 400, 400);

  insertSquare(edges, 200, 320, 4);
  insertSquare(edges, 208, 320, 4);
  insertSquare(edges, 208, 324, 4);
  insertSquare(edges, 170, 350, 8);
  insertSquare(edges, 180, 354, 8);
  insertSquare(edges, 160, 380, 8);
  insertSquare(edges, 140, 328, 4);

  insertSquare(edges, 360, 290, 8);
  insertSquare(edges, 360, 300, 8);
  insertSquare(edges, 350, 300, 8);

  insertSquare(edges, 50, 27, 16);
  insertSquare(edges, 336, 57, 16);
  insertSquare(edges, 222, 367, 16);

  insertOctagon(edges, 80, 30, 10);
  insertOctagon(edges, 360, 60, 10);
  insertOctagon(edges, 370, 150, 10);
  insertOctagon(edges, 250, 370, 10);

  // River top.
  insertPolygon(edges, [P(272, 0), P(286, 0), P(286, 56), P(272, 55)]);

  // River top second.
  insertPolygon(edges, [
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
  ]);

  // River middle.
  insertPolygon(edges, [
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
  ]);

  // Left middle.
  insertPolygon(edges, [
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
  ]);

  // Right.
  insertPolygon(edges, [
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
  ]);

  // Left.
  insertPolygon(edges, [
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
  ]);
}

export function pointRemoval(edges: EdgeContext): void {
  edges.reset();
  square(edges, 400, 400);

  // River middle.
  insertPolygon(edges, [
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
  ]);

  // Left middle.
  insertPolygon(edges, [
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
  ]);

  // Left.
  insertPolygon(edges, [
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
  ]);

  removePoint(edges, 113, 312);
  // removePoint(edges, P(138, 221));
  // removePoint(edges, P(155, 256));
  removePoint(edges, 0, 333);
}

export function selfIntersecting(edges: EdgeContext): void {
  edges.reset();
  square(edges, 100, 100);

  insertPoint(edges, 30, 40);
  insertPoint(edges, 10, 70);
  insertPoint(edges, 50, 50);
  insertPoint(edges, 20, 45);

  enforceEdge(edges, 30, 40, 10, 70);
  enforceEdge(edges, 10, 70, 50, 50);
  enforceEdge(edges, 50, 50, 20, 45);

  insertSquare(edges, 90, 0, 10);
  insertSquare(edges, 20, 50, 30);
}

export function grid(edges: EdgeContext): void {
  edges.reset();
  for (let i = 0; i < edges.count(); i += 1) {
    edges.setFixed(i, false);
  }
  square(edges, 100, 100);

  const a = 50; // Restored original size
  for (let i = 0; i < a; i += 1) {
    for (let j = 0; j < a; j += 1) {
      const x = i;
      const y = j;

      insertPoint(edges, x, y);
      insertPoint(edges, x + 1, y);
      insertPoint(edges, x + 1, y + 1);
      insertPoint(edges, x, y + 1);

      enforceEdge(edges, x, y, x + 1, y);
      enforceEdge(edges, x + 1, y, x + 1, y + 1);
      enforceEdge(edges, x + 1, y + 1, x, y + 1);
      enforceEdge(edges, x, y + 1, x, y);
    }
  }
}

export function tinySquare(edges: EdgeContext): void {
  edges.reset();
  square(edges, 4, 4);

  insertSquare(edges, 0, 0, 1);
  insertSquare(edges, 1, 0, 1);

  removePoint(edges, 0, 1);
}
