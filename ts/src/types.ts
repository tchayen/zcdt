export interface Point {
  x: number;
  y: number;
}

export function P(x: number, y: number): Point {
  return { x, y };
}

export interface HalfEdge {
  originX: number;
  originY: number;
  next: number;
  twin: number;
  fixed: boolean;
}
