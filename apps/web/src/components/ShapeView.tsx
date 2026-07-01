import type { Shape, ShapeRegistry } from "@diagram/core";
import { resolvePort } from "@diagram/core";
import type { EditorTool } from "../types/editor";
import {
  buildLinePath,
  getLinePathPoints,
  isLineShape,
} from "../utils/lines";
import { ShapeGraphics } from "./ShapeGraphics";

interface ShapeViewProps {
  shape: Shape;
  registry: ShapeRegistry;
  selected: boolean;
  tool: EditorTool;
  showPorts: boolean;
  connectSourceId?: string | null;
  isDragging?: boolean;
  onSelect: (id: string) => void;
  onConnectPick: (shapeId: string, portId?: string) => void;
  onDragStart: (id: string, event: React.MouseEvent) => void;
  onEditLabel: (id: string) => void;
  onAddLinePivot?: (shapeId: string, x: number, y: number) => void;
}

export function ShapeView({
  shape,
  registry,
  selected,
  tool,
  showPorts,
  connectSourceId,
  isDragging = false,
  onSelect,
  onConnectPick,
  onDragStart,
  onEditLabel,
  onAddLinePivot,
}: ShapeViewProps) {
  const canDrag =
    (tool === "select" || (tool === "multiselect" && selected)) &&
    !shape.locked;
  const isConnectTarget =
    tool === "connect" && connectSourceId && connectSourceId !== shape.id;
  const lineShape = isLineShape(shape.type);
  const pathPoints = lineShape ? getLinePathPoints(shape) : [];

  const definition = registry.get(shape.type);
  const ports = definition?.ports ?? [];

  function handlePointerDown(event: React.MouseEvent) {
    event.stopPropagation();
    if (tool === "connect") {
      onConnectPick(shape.id);
      return;
    }
    if (tool === "multiselect") {
      onDragStart(shape.id, event);
      return;
    }
    if (tool !== "select") return;
    onSelect(shape.id);
    if (canDrag) onDragStart(shape.id, event);
  }

  return (
    <g
      className={`shape-node${selected ? " selected" : ""}${
        isConnectTarget ? " connect-target" : ""
      }${isDragging ? " dragging" : ""}${lineShape ? " line-shape" : ""}`}
    >
      <ShapeGraphics
        shape={shape}
        showTextBounds={selected && shape.type === "text"}
      />
      {lineShape ? (
        <path
          className="shape-hit shape-hit-line"
          d={buildLinePath(pathPoints)}
          fill="none"
          stroke="transparent"
          strokeWidth={14}
          onMouseDown={handlePointerDown}
          onDoubleClick={(event) => {
            event.stopPropagation();
            if (tool !== "select" || !onAddLinePivot) return;
            const svg = (event.currentTarget as SVGPathElement).ownerSVGElement;
            if (!svg) return;
            const point = svg.createSVGPoint();
            point.x = event.clientX;
            point.y = event.clientY;
            const ctm = svg.getScreenCTM();
            if (!ctm) return;
            const local = point.matrixTransform(ctm.inverse());
            onAddLinePivot(shape.id, local.x, local.y);
          }}
        />
      ) : (
        <rect
          className="shape-hit"
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill="transparent"
          onMouseDown={handlePointerDown}
          onDoubleClick={(event) => {
            event.stopPropagation();
            if (tool === "select") onEditLabel(shape.id);
          }}
        />
      )}
      {showPorts && !lineShape
        ? ports.map((port) => {
            const point = resolvePort(shape, registry, port.id);
            return (
              <circle
                key={port.id}
                className="shape-port"
                cx={point.x}
                cy={point.y}
                r={5}
                onMouseDown={(event) => {
                  event.stopPropagation();
                  if (tool === "connect") {
                    onConnectPick(shape.id, port.id);
                  }
                }}
              />
            );
          })
        : null}
    </g>
  );
}
