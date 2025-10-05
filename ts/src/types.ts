export interface Point {
  x: number;
  y: number;
}

export const P = (x: number, y: number): Point => ({ x, y });

export interface HalfEdge {
  originX: number;
  originY: number;
  next: number;
  twin: number;
  fixed: boolean;
}
