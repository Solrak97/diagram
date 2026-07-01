import type { DiagramDocument, Shape, ShapeRegistry } from "@diagram/core";
import type { InteractionState } from "../types/editor";
import {
  initializeLineShapePoints,
  isLineShape,
  syncShapeFromLinePoints,
  translateLinePoints,
} from "./lines";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function applyInteraction(
  shapes: Shape[],
  interaction: InteractionState | null,
): Shape[] {
  if (!interaction) return shapes;

  if (interaction.kind === "move") {
    return shapes.map((shape) => {
      if (shape.id !== interaction.shapeId) return shape;

      const dx = interaction.x - shape.x;
      const dy = interaction.y - shape.y;
      if (isLineShape(shape.type)) {
        return translateLinePoints(
          { ...shape, x: interaction.x, y: interaction.y },
          dx,
          dy,
        );
      }

      return { ...shape, x: interaction.x, y: interaction.y };
    });
  }

  if (interaction.kind === "move-multiple") {
    return shapes.map((shape) => {
      const position = interaction.positions[shape.id];
      if (!position) return shape;

      const dx = position.x - shape.x;
      const dy = position.y - shape.y;
      if (isLineShape(shape.type)) {
        return translateLinePoints(
          { ...shape, x: position.x, y: position.y },
          dx,
          dy,
        );
      }

      return { ...shape, x: position.x, y: position.y };
    });
  }

  if (interaction.kind === "line-pivot") {
    return shapes.map((shape) =>
      shape.id === interaction.shapeId
        ? syncShapeFromLinePoints(shape, interaction.points)
        : shape,
    );
  }

  if (interaction.kind === "resize") {
    return shapes.map((shape) =>
      shape.id === interaction.shapeId
        ? { ...shape, ...interaction.bounds }
        : shape,
    );
  }

  return shapes;
}

export function getDisplayDocument(
  document: DiagramDocument,
  interaction: InteractionState | null,
): DiagramDocument {
  return {
    ...document,
    shapes: applyInteraction(document.shapes, interaction),
  };
}

export function buildPreviewShape(
  type: string,
  bounds: Bounds,
  registry: ShapeRegistry,
): Shape {
  const definition = registry.get(type);
  const shape = {
    id: "__preview__",
    type,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    zIndex: 9999,
    label:
      type === "text"
        ? "Label"
        : (definition?.label ?? type.replace(/-/g, " ")),
    props: { ...definition?.defaultProps },
    style: { ...definition?.defaultStyle },
    metadata: {},
    locked: true,
  };

  if (isLineShape(type)) {
    return initializeLineShapePoints(shape);
  }

  return shape;
}
