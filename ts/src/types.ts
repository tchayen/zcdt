export interface Point {
  x: number;
  y: number;
}

export function P(x: number, y: number): Point {
  return { x, y };
}
