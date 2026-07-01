export type EditorTool =
  | "select"
  | "multiselect"
  | "pan"
  | "shape"
  | "text"
  | "connect";

export interface PendingConnection {
  shapeId: string;
  portId?: string;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type InteractionState =
  | { kind: "create"; shapeType: string; bounds: Bounds }
  | { kind: "move"; shapeId: string; x: number; y: number }
  | {
      kind: "move-multiple";
      positions: Record<string, { x: number; y: number }>;
    }
  | { kind: "resize"; shapeId: string; bounds: Bounds }
  | { kind: "line-pivot"; shapeId: string; points: { x: number; y: number }[] }
  | { kind: "marquee"; bounds: Bounds };
