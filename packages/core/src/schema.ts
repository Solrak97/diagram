import { z } from "zod";

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const SizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

export const PortSchema = z.object({
  id: z.string(),
  /** Normalized position along shape width (0–1). */
  x: z.number().min(0).max(1),
  /** Normalized position along shape height (0–1). */
  y: z.number().min(0).max(1),
});

export const ShapeStyleSchema = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  textColor: z.string().optional(),
});

export const ShapeSchema = z.object({
  id: z.string(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  zIndex: z.number().int().default(0),
  label: z.string().optional(),
  props: z.record(z.unknown()).default({}),
  style: ShapeStyleSchema.default({}),
  metadata: z.record(z.unknown()).default({}),
  locked: z.boolean().default(false),
  groupId: z.string().optional(),
});

export const ConnectionEndpointSchema = z.object({
  shapeId: z.string(),
  portId: z.string().optional(),
});

export const ConnectionSchema = z.object({
  id: z.string(),
  from: ConnectionEndpointSchema,
  to: ConnectionEndpointSchema,
  type: z.enum(["straight", "orthogonal", "curve"]).default("orthogonal"),
  label: z.string().optional(),
  style: ShapeStyleSchema.default({}),
  metadata: z.record(z.unknown()).default({}),
});

export const GroupSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  shapeIds: z.array(z.string()),
  style: ShapeStyleSchema.default({}),
  metadata: z.record(z.unknown()).default({}),
});

export const ViewportSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  zoom: z.number().positive().default(1),
});

export const DiagramPageSchema = z.object({
  id: z.string(),
  name: z.string().default("Page-1"),
  shapes: z.array(ShapeSchema).default([]),
  connections: z.array(ConnectionSchema).default([]),
  groups: z.array(GroupSchema).default([]),
  viewport: ViewportSchema.default({}),
});

export const DiagramMetadataSchema = z.object({
  title: z.string().default("Untitled diagram"),
  description: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
});

export const DiagramDocumentSchema = z.object({
  version: z.literal("1"),
  metadata: DiagramMetadataSchema.default({}),
  pages: z.array(DiagramPageSchema).optional(),
  activePageId: z.string().optional(),
  shapes: z.array(ShapeSchema).default([]),
  connections: z.array(ConnectionSchema).default([]),
  groups: z.array(GroupSchema).default([]),
  viewport: ViewportSchema.default({}),
});

export type Point = z.infer<typeof PointSchema>;
export type Size = z.infer<typeof SizeSchema>;
export type Port = z.infer<typeof PortSchema>;
export type ShapeStyle = z.infer<typeof ShapeStyleSchema>;
export type Shape = z.infer<typeof ShapeSchema>;
export type ConnectionEndpoint = z.infer<typeof ConnectionEndpointSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type Viewport = z.infer<typeof ViewportSchema>;
export type DiagramPage = z.infer<typeof DiagramPageSchema>;
export type DiagramMetadata = z.infer<typeof DiagramMetadataSchema>;
export type DiagramDocument = z.infer<typeof DiagramDocumentSchema>;

export interface ShapeTypeDefinition {
  type: string;
  label: string;
  category: string;
  description?: string;
  defaultWidth: number;
  defaultHeight: number;
  ports: Port[];
  defaultProps?: Record<string, unknown>;
  defaultStyle?: ShapeStyle;
}

export interface ShapeRegistry {
  get(type: string): ShapeTypeDefinition | undefined;
  list(): ShapeTypeDefinition[];
  register(definition: ShapeTypeDefinition): void;
}
