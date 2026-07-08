import {
  type DiagramDocument,
  type ShapeRegistry,
  buildConnectionPath,
  defaultShapeRegistry,
  resolveEndpoint,
} from "@diagram/core";
import { forwardRef, useRef, useState } from "react";
import type { EditorTool, InteractionState, PendingConnection } from "../types/editor";
import {
  clientToDiagram,
  normalizeBounds,
  normalizeRect,
  rectsIntersect,
} from "../utils/canvas";
import {
  buildPreviewShape,
  getDisplayDocument,
} from "../utils/display";
import {
  buildFreehandPath,
  getLinePathPoints,
  isLineShape,
  normalizeLineCreateBounds,
  simplifyPathPoints,
  type LinePoint,
} from "../utils/lines";
import { LinePivotHandles } from "./LinePivotHandles";
import { ResizeHandles } from "./ResizeHandles";
import { ShapeGraphics } from "./ShapeGraphics";
import { ShapeView } from "./ShapeView";

const DRAG_THRESHOLD_PX = 4;

interface DiagramCanvasProps {
  document: DiagramDocument;
  registry?: ShapeRegistry;
  showGrid?: boolean;
  tool: EditorTool;
  activeShapeType: string;
  selectedShapeIds: string[];
  selectedConnectionId: string | null;
  pendingConnection: PendingConnection | null;
  onSetSelection: (ids: string[]) => void;
  onToggleShape: (id: string) => void;
  onSelectConnection: (id: string | null) => void;
  onMoveShape: (id: string, x: number, y: number) => void;
  onMoveShapes: (updates: { id: string; x: number; y: number }[]) => void;
  onResizeShape: (
    id: string,
    bounds: { x: number; y: number; width: number; height: number },
  ) => void;
  onPan: (x: number, y: number) => void;
  onCreateShape: (
    bounds: { x: number; y: number; width: number; height: number },
    type: string,
  ) => void;
  onCreateFreehand: (points: LinePoint[]) => void;
  onConnectPick: (shapeId: string, portId?: string) => void;
  onEditLabel: (shapeId: string) => void;
  onUpdateLinePoints: (shapeId: string, points: LinePoint[]) => void;
  onAddLinePivot: (shapeId: string, x: number, y: number) => void;
  selectedLinePivotIndex: number | null;
  onSelectLinePivot: (index: number | null) => void;
}

export const DiagramCanvas = forwardRef<SVGSVGElement, DiagramCanvasProps>(
  function DiagramCanvas(
    {
      document,
      registry = defaultShapeRegistry,
      showGrid = false,
      tool,
      activeShapeType,
      selectedShapeIds,
      selectedConnectionId,
      pendingConnection,
      onSetSelection,
      onToggleShape,
      onSelectConnection,
      onMoveShape,
      onMoveShapes,
      onResizeShape,
      onPan,
      onCreateShape,
      onCreateFreehand,
      onConnectPick,
      onEditLabel,
      onUpdateLinePoints,
      onAddLinePivot,
      selectedLinePivotIndex,
      onSelectLinePivot,
    },
    ref,
  ) {
  const { viewport } = document;
  const transform = `translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`;
  const containerRef = useRef<SVGSVGElement>(null);

  function setSvgRef(node: SVGSVGElement | null) {
    containerRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }
  const [interaction, setInteraction] = useState<InteractionState | null>(null);

  const displayDocument = getDisplayDocument(document, interaction);
  const displayShapes = displayDocument.shapes;
  const selectedSet = new Set(selectedShapeIds);

  function getContainerRect() {
    return (
      containerRef.current?.getBoundingClientRect() ??
      new DOMRect(0, 0, window.innerWidth, window.innerHeight)
    );
  }

  function toDiagram(clientX: number, clientY: number) {
    return clientToDiagram(clientX, clientY, getContainerRect(), viewport);
  }

  function startPan(event: React.MouseEvent) {
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = viewport.x;
    const originY = viewport.y;

    const onMove = (moveEvent: MouseEvent) => {
      onPan(
        originX + moveEvent.clientX - startX,
        originY + moveEvent.clientY - startY,
      );
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startCreateDrag(event: React.MouseEvent) {
    const point = toDiagram(event.clientX, event.clientY);
    const shapeType = tool === "text" ? "text" : activeShapeType;

    setInteraction({
      kind: "create",
      shapeType,
      bounds: normalizeRect(point.x, point.y, point.x, point.y),
    });

    const onMove = (moveEvent: MouseEvent) => {
      const current = toDiagram(moveEvent.clientX, moveEvent.clientY);
      const bounds = normalizeRect(point.x, point.y, current.x, current.y);
      setInteraction({ kind: "create", shapeType, bounds });
    };

    const onUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setInteraction(null);

      const end = toDiagram(upEvent.clientX, upEvent.clientY);
      let bounds = normalizeRect(point.x, point.y, end.x, end.y);
      if (isLineShape(shapeType)) {
        const definition = registry.get(shapeType);
        bounds = normalizeLineCreateBounds(
          shapeType,
          bounds,
          definition?.defaultHeight,
        );
      }
      onCreateShape(bounds, shapeType);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startFreehandDraw(event: React.MouseEvent) {
    const start = toDiagram(event.clientX, event.clientY);
    let points: LinePoint[] = [start];
    setInteraction({ kind: "freehand", points });

    const onMove = (moveEvent: MouseEvent) => {
      const current = toDiagram(moveEvent.clientX, moveEvent.clientY);
      const previous = points[points.length - 1];
      if (Math.hypot(current.x - previous.x, current.y - previous.y) < 2 / viewport.zoom) {
        return;
      }
      points = [...points, current];
      setInteraction({ kind: "freehand", points });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setInteraction(null);
      onCreateFreehand(simplifyPathPoints(points, 1.2 / viewport.zoom));
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startMarquee(event: React.MouseEvent) {
    const point = toDiagram(event.clientX, event.clientY);

    setInteraction({
      kind: "marquee",
      bounds: normalizeBounds(point.x, point.y, point.x, point.y),
    });

    const onMove = (moveEvent: MouseEvent) => {
      const current = toDiagram(moveEvent.clientX, moveEvent.clientY);
      setInteraction({
        kind: "marquee",
        bounds: normalizeBounds(point.x, point.y, current.x, current.y),
      });
    };

    const onUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);

      const end = toDiagram(upEvent.clientX, upEvent.clientY);
      const bounds = normalizeBounds(point.x, point.y, end.x, end.y);
      setInteraction(null);

      if (bounds.width < 4 && bounds.height < 4) {
        onSetSelection([]);
        return;
      }

      const ids = document.shapes
        .filter((shape) => rectsIntersect(bounds, shape))
        .map((shape) => shape.id);
      onSetSelection(ids);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startMoveDrag(shapeId: string, event: React.MouseEvent) {
    const item = document.shapes.find((shape) => shape.id === shapeId);
    if (!item) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const originX = item.x;
    const originY = item.y;

    setInteraction({ kind: "move", shapeId, x: originX, y: originY });

    const onMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / viewport.zoom;
      const dy = (moveEvent.clientY - startY) / viewport.zoom;
      setInteraction({
        kind: "move",
        shapeId,
        x: originX + dx,
        y: originY + dy,
      });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setInteraction((current) => {
        if (current?.kind === "move" && current.shapeId === shapeId) {
          onMoveShape(shapeId, current.x, current.y);
        }
        return null;
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startMultiMove(shapeId: string, event: React.MouseEvent) {
    const startX = event.clientX;
    const startY = event.clientY;
    let dragged = false;

    const isInSelection = selectedSet.has(shapeId);
    const moveIds =
      isInSelection && selectedShapeIds.length > 0
        ? selectedShapeIds
        : [shapeId];

    const origins = Object.fromEntries(
      moveIds.map((id) => {
        const shape = document.shapes.find((item) => item.id === id);
        return [id, { x: shape?.x ?? 0, y: shape?.y ?? 0 }];
      }),
    );

    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

      dragged = true;
      if (!isInSelection) {
        onSetSelection([shapeId]);
      }

      const diagramDx = dx / viewport.zoom;
      const diagramDy = dy / viewport.zoom;
      const activeIds = isInSelection ? selectedShapeIds : [shapeId];
      const positions = Object.fromEntries(
        activeIds.map((id) => {
          const origin = origins[id];
          return [
            id,
            {
              x: (origin?.x ?? 0) + diagramDx,
              y: (origin?.y ?? 0) + diagramDy,
            },
          ];
        }),
      );
      setInteraction({ kind: "move-multiple", positions });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);

      if (!dragged) {
        onToggleShape(shapeId);
        setInteraction(null);
        return;
      }

      setInteraction((current) => {
        if (current?.kind === "move-multiple") {
          onMoveShapes(
            Object.entries(current.positions).map(([id, position]) => ({
              id,
              x: position.x,
              y: position.y,
            })),
          );
        }
        return null;
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startLinePivotDrag(shapeId: string, pivotIndex: number) {
    const shape = document.shapes.find((item) => item.id === shapeId);
    if (!shape) return;

    const originPoints = getLinePathPoints(shape);
    let latestPoints = [...originPoints];
    setInteraction({ kind: "line-pivot", shapeId, points: latestPoints });

    const onMove = (moveEvent: MouseEvent) => {
      const current = toDiagram(moveEvent.clientX, moveEvent.clientY);
      latestPoints = [...originPoints];
      latestPoints[pivotIndex] = { x: current.x, y: current.y };
      setInteraction({ kind: "line-pivot", shapeId, points: latestPoints });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      onUpdateLinePoints(shapeId, latestPoints);
      setInteraction(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleShapeDragStart(shapeId: string, event: React.MouseEvent) {
    if (tool === "multiselect") {
      startMultiMove(shapeId, event);
      return;
    }
    startMoveDrag(shapeId, event);
  }

  function handleBackgroundMouseDown(event: React.MouseEvent) {
    if (event.button !== 0) return;
    if (event.target !== event.currentTarget) return;

    onSetSelection([]);
    onSelectConnection(null);

    if (tool === "pan" || (tool === "select" && event.target === event.currentTarget)) {
      startPan(event);
      return;
    }

    if (tool === "multiselect") {
      startMarquee(event);
      return;
    }

    if (tool === "shape" || tool === "text") {
      startCreateDrag(event);
      return;
    }

    if (tool === "draw") {
      startFreehandDraw(event);
    }
  }

  const previewShape =
    interaction?.kind === "create"
      ? buildPreviewShape(
          interaction.shapeType,
          isLineShape(interaction.shapeType)
            ? normalizeLineCreateBounds(
                interaction.shapeType,
                interaction.bounds,
                registry.get(interaction.shapeType)?.defaultHeight,
              )
            : interaction.bounds,
          registry,
        )
      : null;

  const freehandPreview =
    interaction?.kind === "freehand" ? interaction.points : null;

  const marqueeBounds =
    interaction?.kind === "marquee" ? interaction.bounds : null;

  const soleSelectedId =
    selectedShapeIds.length === 1 ? selectedShapeIds[0] : null;
  const selectedDisplayShape = soleSelectedId
    ? displayShapes.find((shape) => shape.id === soleSelectedId)
    : undefined;
  const selectedLinePoints =
    selectedDisplayShape && isLineShape(selectedDisplayShape.type)
      ? getLinePathPoints(selectedDisplayShape)
      : null;

  const draggingShapeIds = new Set<string>(
    interaction?.kind === "move"
      ? [interaction.shapeId]
      : interaction?.kind === "move-multiple"
        ? Object.keys(interaction.positions)
        : [],
  );

  const cursorClass =
    tool === "pan"
      ? "cursor-pan"
      : tool === "shape" || tool === "text"
        ? "cursor-crosshair"
        : tool === "draw"
        ? "cursor-crosshair"
        : tool === "connect"
          ? "cursor-connect"
          : tool === "multiselect"
            ? "cursor-crosshair"
            : "cursor-select";

  return (
    <svg ref={setSvgRef} className={`diagram-canvas ${cursorClass}`}>
      <defs>
        <pattern
          id="diagram-grid"
          width={20}
          height={20}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="transparent" pointerEvents="none" />
      <g transform={transform}>
        {showGrid ? (
          <rect
            x={-10000}
            y={-10000}
            width={20000}
            height={20000}
            fill="url(#diagram-grid)"
            pointerEvents="none"
          />
        ) : null}
        <rect
          x={-10000}
          y={-10000}
          width={20000}
          height={20000}
          fill="transparent"
          onMouseDown={handleBackgroundMouseDown}
        />

        {displayDocument.connections.map((connection) => {
          const from = resolveEndpoint(displayDocument, registry, connection.from);
          const to = resolveEndpoint(displayDocument, registry, connection.to);
          if (!from || !to) return null;

          const path = buildConnectionPath(connection, from, to);
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          const selected = selectedConnectionId === connection.id;

          return (
            <g key={connection.id}>
              <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                onMouseDown={(event) => {
                  event.stopPropagation();
                  if (tool !== "select") return;
                  onSelectConnection(connection.id);
                  onSetSelection([]);
                }}
              />
              <path
                d={path}
                fill="none"
                className={`connection-line${selected ? " selected" : ""}`}
                stroke={
                  selected
                    ? "#0ea5e9"
                    : (connection.style.stroke ?? "#64748b")
                }
                strokeWidth={selected ? 3 : (connection.style.strokeWidth ?? 2)}
                markerEnd="url(#arrow)"
                pointerEvents="none"
              />
              {connection.label ? (
                <text
                  x={midX}
                  y={midY - 8}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#334155"
                  pointerEvents="none"
                >
                  {connection.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {pendingConnection
          ? (() => {
              const from = resolveEndpoint(displayDocument, registry, {
                shapeId: pendingConnection.shapeId,
                portId: pendingConnection.portId,
              });
              if (!from) return null;
              return (
                <circle
                  className="connect-pending"
                  cx={from.x}
                  cy={from.y}
                  r={6}
                />
              );
            })()
          : null}

        {freehandPreview && freehandPreview.length > 1 ? (
          <path
            d={buildFreehandPath(freehandPreview)}
            fill="none"
            stroke="#1e293b"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.72}
            pointerEvents="none"
          />
        ) : null}

        {[...displayShapes]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((shape) => (
            <ShapeView
              key={shape.id}
              shape={shape}
              registry={registry}
              selected={selectedSet.has(shape.id)}
              tool={tool}
              showPorts={tool === "connect"}
              connectSourceId={pendingConnection?.shapeId}
              isDragging={draggingShapeIds.has(shape.id)}
              onSelect={(id) => {
                onSetSelection([id]);
                onSelectConnection(null);
              }}
              onConnectPick={onConnectPick}
              onEditLabel={onEditLabel}
              onAddLinePivot={onAddLinePivot}
              onDragStart={handleShapeDragStart}
            />
          ))}

        {previewShape ? (
          <ShapeGraphics shape={previewShape} preview showLabel />
        ) : null}

        {marqueeBounds ? (
          <rect
            className="marquee-select"
            x={marqueeBounds.x}
            y={marqueeBounds.y}
            width={marqueeBounds.width}
            height={marqueeBounds.height}
          />
        ) : null}

        {selectedLinePoints && tool === "select" ? (
          <LinePivotHandles
            points={selectedLinePoints}
            zoom={viewport.zoom}
            selectedPivotIndex={selectedLinePivotIndex}
            onPivotSelect={onSelectLinePivot}
            onPivotDragStart={(index) => {
              if (!selectedDisplayShape) return;
              startLinePivotDrag(selectedDisplayShape.id, index);
            }}
          />
        ) : null}

        {selectedDisplayShape &&
        tool === "select" &&
        !isLineShape(selectedDisplayShape.type) ? (
          <ResizeHandles
            shape={selectedDisplayShape}
            zoom={viewport.zoom}
            onResizeDrag={(bounds) => {
              setInteraction({
                kind: "resize",
                shapeId: selectedDisplayShape.id,
                bounds,
              });
            }}
            onResizeCommit={(bounds) => {
              setInteraction(null);
              onResizeShape(selectedDisplayShape.id, bounds);
            }}
          />
        ) : null}
      </g>

      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
        </marker>
        <marker
          id="seq-arrow-solid"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#1e293b" />
        </marker>
        <marker
          id="seq-arrow-open"
          viewBox="0 0 10 10"
          refX="1"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path
            d="M 10 1 L 1 5 L 10 9"
            fill="none"
            stroke="#1e293b"
            strokeWidth="1.75"
          />
        </marker>
      </defs>
    </svg>
  );
  },
);
