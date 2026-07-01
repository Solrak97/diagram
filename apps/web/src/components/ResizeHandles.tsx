import type { Shape } from "@diagram/core";

type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface ResizeHandlesProps {
  shape: Shape;
  zoom: number;
  onResizeDrag: (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onResizeCommit: (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
}

const HANDLES: { id: HandleId; cx: number; cy: number; cursor: string }[] = [
  { id: "nw", cx: 0, cy: 0, cursor: "nwse-resize" },
  { id: "n", cx: 0.5, cy: 0, cursor: "ns-resize" },
  { id: "ne", cx: 1, cy: 0, cursor: "nesw-resize" },
  { id: "e", cx: 1, cy: 0.5, cursor: "ew-resize" },
  { id: "se", cx: 1, cy: 1, cursor: "nwse-resize" },
  { id: "s", cx: 0.5, cy: 1, cursor: "ns-resize" },
  { id: "sw", cx: 0, cy: 1, cursor: "nesw-resize" },
  { id: "w", cx: 0, cy: 0.5, cursor: "ew-resize" },
];

const MIN_SIZE = 24;

function applyResize(
  shape: Shape,
  handle: HandleId,
  dx: number,
  dy: number,
) {
  let { x, y, width, height } = shape;

  if (handle.includes("w")) {
    x += dx;
    width -= dx;
  }
  if (handle.includes("e")) {
    width += dx;
  }
  if (handle.includes("n")) {
    y += dy;
    height -= dy;
  }
  if (handle.includes("s")) {
    height += dy;
  }

  if (width < MIN_SIZE) {
    if (handle.includes("w")) x -= MIN_SIZE - width;
    width = MIN_SIZE;
  }
  if (height < MIN_SIZE) {
    if (handle.includes("n")) y -= MIN_SIZE - height;
    height = MIN_SIZE;
  }

  return { x, y, width, height };
}

export function ResizeHandles({
  shape,
  zoom,
  onResizeDrag,
  onResizeCommit,
}: ResizeHandlesProps) {
  const size = 8 / zoom;

  return (
    <g className="resize-handles">
      {HANDLES.map((handle) => {
        const hx = shape.x + shape.width * handle.cx;
        const hy = shape.y + shape.height * handle.cy;

        return (
          <rect
            key={handle.id}
            x={hx - size / 2}
            y={hy - size / 2}
            width={size}
            height={size}
            className="resize-handle"
            style={{ cursor: handle.cursor }}
            onMouseDown={(event) => {
              event.stopPropagation();
              const origin = shape;
              const startX = event.clientX;
              const startY = event.clientY;
              let latest = {
                x: origin.x,
                y: origin.y,
                width: origin.width,
                height: origin.height,
              };

              const onMove = (moveEvent: MouseEvent) => {
                const dx = (moveEvent.clientX - startX) / zoom;
                const dy = (moveEvent.clientY - startY) / zoom;
                latest = applyResize(origin, handle.id, dx, dy);
                onResizeDrag(latest);
              };

              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
                onResizeCommit(latest);
              };

              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          />
        );
      })}
    </g>
  );
}
