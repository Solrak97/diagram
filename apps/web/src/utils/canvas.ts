import type { Viewport } from "@diagram/core";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 1.2;

export function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Scale wheel deltas to pixels for line/page delta modes. */
export function wheelDeltaToPixels(delta: number, deltaMode: number): number {
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return delta * 16;
  }
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return delta * window.innerHeight;
  }
  return delta;
}

/**
 * macOS trackpad pinch-to-zoom is emitted as wheel events with ctrlKey set.
 * Two-finger scroll (without ctrl) should pan, not zoom.
 */
export function isPinchZoomWheel(event: WheelEvent): boolean {
  return event.ctrlKey;
}

export function getWheelPanDelta(event: WheelEvent): { dx: number; dy: number } {
  return {
    dx: wheelDeltaToPixels(event.deltaX, event.deltaMode),
    dy: wheelDeltaToPixels(event.deltaY, event.deltaMode),
  };
}

/** Continuous zoom factor for trackpad pinch (ctrl+wheel on macOS). */
export function getPinchZoomFactor(event: WheelEvent): number {
  const deltaY = wheelDeltaToPixels(event.deltaY, event.deltaMode);
  return Math.exp(-deltaY * 0.002);
}

/** Zoom while keeping the diagram point under the focal pixel fixed. */
export function zoomViewportAt(
  viewport: Viewport,
  nextZoom: number,
  focalClientX: number,
  focalClientY: number,
  container: DOMRect,
): Viewport {
  const zoom = clampZoom(nextZoom);
  const diagramX = (focalClientX - container.left - viewport.x) / viewport.zoom;
  const diagramY = (focalClientY - container.top - viewport.y) / viewport.zoom;

  return {
    zoom,
    x: focalClientX - container.left - diagramX * zoom,
    y: focalClientY - container.top - diagramY * zoom,
  };
}

export function zoomViewportByFactor(
  viewport: Viewport,
  factor: number,
  focalClientX: number,
  focalClientY: number,
  container: DOMRect,
): Viewport {
  return zoomViewportAt(
    viewport,
    viewport.zoom * factor,
    focalClientX,
    focalClientY,
    container,
  );
}

export function clientToDiagram(
  clientX: number,
  clientY: number,
  container: DOMRect,
  viewport: Viewport,
) {
  return {
    x: (clientX - container.left - viewport.x) / viewport.zoom,
    y: (clientY - container.top - viewport.y) / viewport.zoom,
  };
}

export function diagramToClient(
  x: number,
  y: number,
  container: DOMRect,
  viewport: Viewport,
) {
  return {
    x: container.left + viewport.x + x * viewport.zoom,
    y: container.top + viewport.y + y * viewport.zoom,
  };
}

export function normalizeBounds(x1: number, y1: number, x2: number, y2: number) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

export function normalizeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minSize = 24,
) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const width = Math.max(Math.abs(x2 - x1), minSize);
  const height = Math.max(Math.abs(y2 - y1), minSize);
  return { x, y, width, height };
}

export function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
