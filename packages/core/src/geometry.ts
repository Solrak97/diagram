import {
  Connection,
  ConnectionEndpoint,
  Port,
  Shape,
  ShapeRegistry,
} from "./schema.js";

export interface ResolvedPoint {
  x: number;
  y: number;
}

const CENTER_PORT: Port = { id: "center", x: 0.5, y: 0.5 };

export function resolvePort(
  shape: Shape,
  registry: ShapeRegistry,
  portId?: string,
): ResolvedPoint {
  const definition = registry.get(shape.type);
  const ports = definition?.ports ?? [
    { id: "top", x: 0.5, y: 0 },
    { id: "right", x: 1, y: 0.5 },
    { id: "bottom", x: 0.5, y: 1 },
    { id: "left", x: 0, y: 0.5 },
    CENTER_PORT,
  ];

  const port =
    ports.find((item) => item.id === portId) ??
    ports.find((item) => item.id === "center") ??
    CENTER_PORT;

  return {
    x: shape.x + shape.width * port.x,
    y: shape.y + shape.height * port.y,
  };
}

export function resolveEndpoint(
  document: { shapes: Shape[] },
  registry: ShapeRegistry,
  endpoint: ConnectionEndpoint,
): ResolvedPoint | undefined {
  const shape = document.shapes.find((item) => item.id === endpoint.shapeId);
  if (!shape) {
    return undefined;
  }
  return resolvePort(shape, registry, endpoint.portId);
}

export function buildOrthogonalPath(
  from: ResolvedPoint,
  to: ResolvedPoint,
): string {
  const midX = (from.x + to.x) / 2;
  return [
    `M ${from.x} ${from.y}`,
    `L ${midX} ${from.y}`,
    `L ${midX} ${to.y}`,
    `L ${to.x} ${to.y}`,
  ].join(" ");
}

export function buildStraightPath(
  from: ResolvedPoint,
  to: ResolvedPoint,
): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

export function buildCurvePath(from: ResolvedPoint, to: ResolvedPoint): string {
  const dx = Math.abs(to.x - from.x) * 0.5;
  const c1x = from.x + dx;
  const c1y = from.y;
  const c2x = to.x - dx;
  const c2y = to.y;
  return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`;
}

export function buildConnectionPath(
  connection: Connection,
  from: ResolvedPoint,
  to: ResolvedPoint,
): string {
  switch (connection.type) {
    case "straight":
      return buildStraightPath(from, to);
    case "curve":
      return buildCurvePath(from, to);
    case "orthogonal":
    default:
      return buildOrthogonalPath(from, to);
  }
}
