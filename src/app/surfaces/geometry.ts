/** A simple tuole for positions where the first element is x and the second y. */
export type Point2d = [x: number, y: number];

export interface Rect {
  /** The leftmost coordinate. */
  x: number;
  /** The topmost coordinate. */
  y: number;
  /** The width of the rectangle. */
  width: number;
  /** The height of the rectange. */
  height: number;
}

/** Gets the location of a point within the rectangle. */
export function getRelativeLocation([x, y]: Point2d, rect: Rect): Point2d {
  return [(x - rect.x), (y - rect.y)];
}
/** Get the % position of a point within a Rectangle. */
export function getRelativeLocationPercent([x, y]: Point2d, rect: Rect): Point2d {
  return [
    (x - rect.x) / rect.width,
    (y - rect.y) / rect.height
  ];
}

export function isPointInRect([x, y]: Point2d, rect: Rect) {
  return (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height);
}
