import type { Shape } from "@diagram/core";

export type LineStyle = "solid" | "dashed" | "dotted";

export interface LinePoint {
  x: number;
  y: number;
}

export function isFreehandShape(type: string): boolean {
  return type === "freehand";
}

export function isLineShape(type: string): boolean {
  return type === "arrow-line" || type === "uml-seq-message";
}

export function isPointPathShape(type: string): boolean {
  return isLineShape(type) || isFreehandShape(type);
}

export function isHorizontalLine(shape: Shape): boolean {
  return shape.type === "uml-seq-message" || shape.props.horizontal === true;
}

export function hasLinePoints(shape: Shape): boolean {
  return (
    Array.isArray(shape.props.points) &&
    (shape.props.points as LinePoint[]).length >= 2
  );
}

export function getDefaultLineEndpoints(shape: Shape): LinePoint[] {
  if (isHorizontalLine(shape)) {
    const y = shape.y + shape.height / 2;
    return [
      { x: shape.x, y },
      { x: shape.x + shape.width, y },
    ];
  }

  return [
    { x: shape.x, y: shape.y },
    { x: shape.x + shape.width, y: shape.y + shape.height },
  ];
}

export function getLinePathPoints(shape: Shape): LinePoint[] {
  if (hasLinePoints(shape)) {
    return shape.props.points as LinePoint[];
  }
  return getDefaultLineEndpoints(shape);
}

export function getShapePathPoints(shape: Shape): LinePoint[] {
  if (isLineShape(shape.type)) {
    return getLinePathPoints(shape);
  }
  if (isFreehandShape(shape.type) && hasLinePoints(shape)) {
    return shape.props.points as LinePoint[];
  }
  return [];
}

export function getLineStyle(shape: Shape): LineStyle {
  const value = shape.props.lineStyle;
  if (value === "dashed" || value === "dotted" || value === "solid") {
    return value;
  }
  if (shape.props.return === true) {
    return "dashed";
  }
  return "solid";
}

export function getLineStrokeDasharray(shape: Shape): string | undefined {
  switch (getLineStyle(shape)) {
    case "dashed":
      return "8 5";
    case "dotted":
      return "2 4";
    default:
      return undefined;
  }
}

export function boundsFromPoints(points: LinePoint[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
}

export function syncShapeFromLinePoints(
  shape: Shape,
  points: LinePoint[],
): Shape {
  const bounds = boundsFromPoints(points);
  return {
    ...shape,
    ...bounds,
    props: {
      ...shape.props,
      points,
    },
  };
}

export function syncShapeFromPathPoints(shape: Shape, points: LinePoint[]): Shape {
  const bounds = boundsFromPoints(points);
  return {
    ...shape,
    ...bounds,
    props: {
      ...shape.props,
      points,
    },
  };
}

export function buildLinePath(points: LinePoint[]): string {
  if (points.length < 2) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function buildFreehandPath(points: LinePoint[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) return buildLinePath(points);

  const [first, second, ...rest] = points;
  let path = `M ${first.x} ${first.y} Q ${first.x} ${first.y} ${(first.x + second.x) / 2} ${(first.y + second.y) / 2}`;

  let prev = second;
  for (const point of rest) {
    const midX = (prev.x + point.x) / 2;
    const midY = (prev.y + point.y) / 2;
    path += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
    prev = point;
  }

  path += ` Q ${prev.x} ${prev.y} ${prev.x} ${prev.y}`;
  return path;
}

export function projectPointOnSegment(
  px: number,
  py: number,
  a: LinePoint,
  b: LinePoint,
): LinePoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return { x: a.x, y: a.y };

  const t = Math.max(
    0,
    Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lengthSq),
  );
  return { x: a.x + dx * t, y: a.y + dy * t };
}

export function insertPivotAtPoint(
  points: LinePoint[],
  px: number,
  py: number,
): LinePoint[] {
  if (points.length < 2) return points;

  let bestDistance = Infinity;
  let insertIndex = 1;
  let insertPoint = { x: px, y: py };

  for (let index = 0; index < points.length - 1; index += 1) {
    const projected = projectPointOnSegment(
      px,
      py,
      points[index],
      points[index + 1],
    );
    const distance = Math.hypot(px - projected.x, py - projected.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      insertIndex = index + 1;
      insertPoint = projected;
    }
  }

  const next = [...points];
  next.splice(insertIndex, 0, insertPoint);
  return next;
}

export function removePivotAtIndex(
  points: LinePoint[],
  index: number,
): LinePoint[] {
  if (points.length <= 2) return points;
  if (index <= 0 || index >= points.length - 1) return points;
  return points.filter((_, pointIndex) => pointIndex !== index);
}

export function translateLinePoints(
  shape: Shape,
  dx: number,
  dy: number,
): Shape {
  const points = getLinePathPoints(shape).map((point) => ({
    x: point.x + dx,
    y: point.y + dy,
  }));
  return syncShapeFromLinePoints(shape, points);
}

export function translatePathPoints(shape: Shape, dx: number, dy: number): Shape {
  const points = getShapePathPoints(shape).map((point) => ({
    x: point.x + dx,
    y: point.y + dy,
  }));
  return syncShapeFromPathPoints(shape, points);
}

export function simplifyPathPoints(
  points: LinePoint[],
  tolerance = 1.5,
): LinePoint[] {
  if (points.length <= 2) return points;

  function perpendicularDistance(point: LinePoint, start: LinePoint, end: LinePoint) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) {
      return Math.hypot(point.x - start.x, point.y - start.y);
    }
    return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) /
      Math.hypot(dx, dy);
  }

  function reduce(segment: LinePoint[]): LinePoint[] {
    if (segment.length <= 2) return segment;

    let maxDistance = 0;
    let index = 0;
    const start = segment[0];
    const end = segment[segment.length - 1];

    for (let i = 1; i < segment.length - 1; i += 1) {
      const distance = perpendicularDistance(segment[i], start, end);
      if (distance > maxDistance) {
        index = i;
        maxDistance = distance;
      }
    }

    if (maxDistance <= tolerance) {
      return [start, end];
    }

    const left = reduce(segment.slice(0, index + 1));
    const right = reduce(segment.slice(index));
    return [...left.slice(0, -1), ...right];
  }

  return reduce(points);
}

export function normalizeLineCreateBounds(
  type: string,
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  defaultHeight = 28,
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(bounds.x, bounds.x + bounds.width);
  const y = Math.min(bounds.y, bounds.y + bounds.height);
  const width = Math.max(Math.abs(bounds.width), 32);

  if (type === "uml-seq-message") {
    return { x, y, width, height: defaultHeight };
  }

  if (type === "arrow-line") {
    const height = Math.max(Math.abs(bounds.height), 8);
    return { x, y, width, height };
  }

  const height = Math.max(Math.abs(bounds.height), 8);
  return { x, y, width, height };
}

export function initializeLineShapePoints(shape: Shape): Shape {
  return syncShapeFromLinePoints(shape, getDefaultLineEndpoints(shape));
}
