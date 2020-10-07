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

export interface Circle {
   radius: number;
   /** center x. */
   x: number;
   /** center y. */
   y: number;
}

const halfPi = Math.PI / 2;
const twoPi = Math.PI * 2;

/** Gets the angle from point a to point b in radians. */
export function getAngle([ax, ay]: Point2d, [bx, by]: Point2d) {
  const rads = Math.atan2(by - ay, bx - ax) + halfPi;
  return getNormalizedAngle(rads);
}
/** Gets the distance from point a to point b. */
export function getDistance([ax, ay]: Point2d, [bx, by]: Point2d) {
  return Math.sqrt(Math.pow(bx - ax, 2) + Math.pow(by - ay, 2));
}
export function getNormalizedAngle(angle: number) {
  return (angle >= 0) ? angle % twoPi : twoPi + (angle % twoPi);
}
export function getNormalizedDistance(pt: Point2d, circ: Circle) {
  return 1 + (getDistance([circ.x, circ.y], pt) - circ.radius) / circ.radius;
}
/** Get the position of a point within a Rectangle between 0 and 1 for x and y. */
export function getNormalizedPosition([x, y]: Point2d, rect: Rect): Point2d {
  return [
    (x - rect.x) / rect.width,
    (y - rect.y) / rect.height
  ];
}
/** Gets the location of a point within the rectangle. */
export function getRelativePosition([x, y]: Point2d, rect: Rect): Point2d {
  return [(x - rect.x), (y - rect.y)];
}

export function isPointInRect([x, y]: Point2d, rect: Rect) {
  return (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height);
}
