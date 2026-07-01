import { nanoid } from "nanoid";
import {
  Connection,
  DiagramDocument,
  Group,
  Shape,
  ShapeRegistry,
  Viewport,
} from "./schema.js";
import { touchDocument } from "./serialize.js";

export class DiagramError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagramError";
  }
}

function assertShapeExists(document: DiagramDocument, shapeId: string): Shape {
  const shape = document.shapes.find((item) => item.id === shapeId);
  if (!shape) {
    throw new DiagramError(`Shape "${shapeId}" not found`);
  }
  return shape;
}

function assertConnectionExists(
  document: DiagramDocument,
  connectionId: string,
): Connection {
  const connection = document.connections.find(
    (item) => item.id === connectionId,
  );
  if (!connection) {
    throw new DiagramError(`Connection "${connectionId}" not found`);
  }
  return connection;
}

export interface AddShapeInput {
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  label?: string;
  props?: Record<string, unknown>;
  style?: Shape["style"];
  metadata?: Record<string, unknown>;
  id?: string;
  groupId?: string;
}

export function addShape(
  document: DiagramDocument,
  registry: ShapeRegistry,
  input: AddShapeInput,
): DiagramDocument {
  const definition = registry.get(input.type);
  if (!definition) {
    throw new DiagramError(`Unknown shape type "${input.type}"`);
  }

  if (input.groupId && !document.groups.some((g) => g.id === input.groupId)) {
    throw new DiagramError(`Group "${input.groupId}" not found`);
  }

  const shape: Shape = {
    id: input.id ?? nanoid(10),
    type: input.type,
    x: input.x,
    y: input.y,
    width: input.width ?? definition.defaultWidth,
    height: input.height ?? definition.defaultHeight,
    rotation: input.rotation ?? 0,
    zIndex: input.zIndex ?? document.shapes.length,
    label: input.label,
    props: { ...definition.defaultProps, ...input.props },
    style: { ...definition.defaultStyle, ...input.style },
    metadata: input.metadata ?? {},
    locked: false,
    groupId: input.groupId,
  };

  return touchDocument({
    ...document,
    shapes: [...document.shapes, shape],
  });
}

export type UpdateShapeInput = Partial<
  Omit<Shape, "id" | "type"> & { type: string }
>;

export function updateShape(
  document: DiagramDocument,
  shapeId: string,
  updates: UpdateShapeInput,
): DiagramDocument {
  assertShapeExists(document, shapeId);

  return touchDocument({
    ...document,
    shapes: document.shapes.map((shape) =>
      shape.id === shapeId
        ? {
            ...shape,
            ...updates,
            props: updates.props
              ? { ...shape.props, ...updates.props }
              : shape.props,
            style: updates.style
              ? { ...shape.style, ...updates.style }
              : shape.style,
            metadata: updates.metadata
              ? { ...shape.metadata, ...updates.metadata }
              : shape.metadata,
          }
        : shape,
    ),
  });
}

export function removeShape(
  document: DiagramDocument,
  shapeId: string,
): DiagramDocument {
  assertShapeExists(document, shapeId);

  return touchDocument({
    ...document,
    shapes: document.shapes.filter((shape) => shape.id !== shapeId),
    connections: document.connections.filter(
      (connection) =>
        connection.from.shapeId !== shapeId &&
        connection.to.shapeId !== shapeId,
    ),
    groups: document.groups.map((group) => ({
      ...group,
      shapeIds: group.shapeIds.filter((id) => id !== shapeId),
    })),
  });
}

export interface ConnectInput {
  fromShapeId: string;
  toShapeId: string;
  fromPortId?: string;
  toPortId?: string;
  type?: Connection["type"];
  label?: string;
  style?: Connection["style"];
  metadata?: Record<string, unknown>;
  id?: string;
}

export function connectShapes(
  document: DiagramDocument,
  input: ConnectInput,
): DiagramDocument {
  assertShapeExists(document, input.fromShapeId);
  assertShapeExists(document, input.toShapeId);

  const connection: Connection = {
    id: input.id ?? nanoid(10),
    from: { shapeId: input.fromShapeId, portId: input.fromPortId },
    to: { shapeId: input.toShapeId, portId: input.toPortId },
    type: input.type ?? "orthogonal",
    label: input.label,
    style: input.style ?? {},
    metadata: input.metadata ?? {},
  };

  return touchDocument({
    ...document,
    connections: [...document.connections, connection],
  });
}

export type UpdateConnectionInput = Partial<
  Omit<Connection, "id">
>;

export function updateConnection(
  document: DiagramDocument,
  connectionId: string,
  updates: UpdateConnectionInput,
): DiagramDocument {
  assertConnectionExists(document, connectionId);

  return touchDocument({
    ...document,
    connections: document.connections.map((connection) =>
      connection.id === connectionId
        ? {
            ...connection,
            ...updates,
            from: updates.from ?? connection.from,
            to: updates.to ?? connection.to,
            style: updates.style
              ? { ...connection.style, ...updates.style }
              : connection.style,
            metadata: updates.metadata
              ? { ...connection.metadata, ...updates.metadata }
              : connection.metadata,
          }
        : connection,
    ),
  });
}

export function disconnectShapes(
  document: DiagramDocument,
  connectionId: string,
): DiagramDocument {
  assertConnectionExists(document, connectionId);

  return touchDocument({
    ...document,
    connections: document.connections.filter(
      (connection) => connection.id !== connectionId,
    ),
  });
}

export interface CreateGroupInput {
  shapeIds: string[];
  label?: string;
  id?: string;
  style?: Group["style"];
  metadata?: Record<string, unknown>;
}

export function createGroup(
  document: DiagramDocument,
  input: CreateGroupInput,
): DiagramDocument {
  for (const shapeId of input.shapeIds) {
    assertShapeExists(document, shapeId);
  }

  const groupId = input.id ?? nanoid(10);
  const group: Group = {
    id: groupId,
    label: input.label,
    shapeIds: input.shapeIds,
    style: input.style ?? {},
    metadata: input.metadata ?? {},
  };

  return touchDocument({
    ...document,
    groups: [...document.groups, group],
    shapes: document.shapes.map((shape) =>
      input.shapeIds.includes(shape.id)
        ? { ...shape, groupId }
        : shape,
    ),
  });
}

export function updateViewport(
  document: DiagramDocument,
  viewport: Partial<Viewport>,
): DiagramDocument {
  return touchDocument({
    ...document,
    viewport: { ...document.viewport, ...viewport },
  });
}

export function replaceDocument(
  document: DiagramDocument,
  next: DiagramDocument,
): DiagramDocument {
  return touchDocument(next);
}

export interface ImportDocumentOptions {
  offsetX?: number;
  offsetY?: number;
}

export interface ImportDocumentResult {
  document: DiagramDocument;
  importedShapeIds: string[];
}

function shapeBounds(shapes: Shape[]) {
  if (shapes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapes) {
    minX = Math.min(minX, shape.x);
    minY = Math.min(minY, shape.y);
    maxX = Math.max(maxX, shape.x + shape.width);
    maxY = Math.max(maxY, shape.y + shape.height);
  }

  return { minX, minY, maxX, maxY };
}

export function importDocument(
  target: DiagramDocument,
  source: DiagramDocument,
  options: ImportDocumentOptions = {},
): ImportDocumentResult {
  if (source.shapes.length === 0) {
    return { document: target, importedShapeIds: [] };
  }

  const idMap = new Map<string, string>();
  for (const shape of source.shapes) {
    idMap.set(shape.id, nanoid(10));
  }
  for (const group of source.groups) {
    idMap.set(group.id, nanoid(10));
  }
  for (const connection of source.connections) {
    idMap.set(connection.id, nanoid(10));
  }

  const targetBounds = shapeBounds(target.shapes);
  const sourceBounds = shapeBounds(source.shapes);
  const gap = 80;

  const offsetX =
    options.offsetX ??
    (target.shapes.length === 0
      ? 0
      : targetBounds.maxX + gap - sourceBounds.minX);
  const offsetY =
    options.offsetY ??
    (target.shapes.length === 0 ? 0 : targetBounds.minY - sourceBounds.minY);

  const maxZIndex = Math.max(
    0,
    ...target.shapes.map((shape) => shape.zIndex),
    ...source.shapes.map((shape) => shape.zIndex),
  );

  const importedShapeIds: string[] = [];
  const importedShapes = source.shapes.map((shape, index) => {
    const nextId = idMap.get(shape.id)!;
    importedShapeIds.push(nextId);
    return {
      ...shape,
      id: nextId,
      x: shape.x + offsetX,
      y: shape.y + offsetY,
      groupId: shape.groupId ? idMap.get(shape.groupId) : undefined,
      zIndex: maxZIndex + index + 1,
    };
  });

  const importedGroups = source.groups.map((group) => ({
    ...group,
    id: idMap.get(group.id)!,
    shapeIds: group.shapeIds
      .map((shapeId) => idMap.get(shapeId))
      .filter((shapeId): shapeId is string => Boolean(shapeId)),
  }));

  const importedConnections = source.connections.flatMap((connection) => {
    const fromShapeId = idMap.get(connection.from.shapeId);
    const toShapeId = idMap.get(connection.to.shapeId);
    const nextId = idMap.get(connection.id);
    if (!fromShapeId || !toShapeId || !nextId) {
      return [];
    }

    return [
      {
        ...connection,
        id: nextId,
        from: {
          shapeId: fromShapeId,
          portId: connection.from.portId,
        },
        to: {
          shapeId: toShapeId,
          portId: connection.to.portId,
        },
      },
    ];
  });

  return {
    document: touchDocument({
      ...target,
      shapes: [...target.shapes, ...importedShapes],
      connections: [...target.connections, ...importedConnections],
      groups: [...target.groups, ...importedGroups],
    }),
    importedShapeIds,
  };
}

export function getShape(
  document: DiagramDocument,
  shapeId: string,
): Shape | undefined {
  return document.shapes.find((shape) => shape.id === shapeId);
}

export function getConnection(
  document: DiagramDocument,
  connectionId: string,
): Connection | undefined {
  return document.connections.find(
    (connection) => connection.id === connectionId,
  );
}
