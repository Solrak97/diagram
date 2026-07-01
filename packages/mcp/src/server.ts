import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ShapeRegistry } from "@diagram/core";
import {
  type DiagramStore,
  addShape,
  connectShapes,
  createGroup,
  disconnectShapes,
  exportCatalog,
  removeShape,
  replaceDocument,
  serializeForResponse,
  updateConnection,
  updateShape,
  updateViewport,
} from "./store.js";
import { formatSchema, handleError, pathSchema, textResult } from "./schemas.js";

export interface DiagramMcpServerDeps {
  store: DiagramStore;
  registry: ShapeRegistry;
}

export function createDiagramMcpServer({
  store,
  registry,
}: DiagramMcpServerDeps): McpServer {
  const server = new McpServer({
    name: "diagram",
    version: "0.1.0",
  });

  server.tool(
    "diagram_list_shape_types",
    "List all registered shape types available for diagram creation",
    { format: formatSchema.optional() },
    async ({ format = "json" }) => textResult(exportCatalog(format)),
  );

  server.tool(
    "diagram_create",
    "Create a new empty diagram file",
    {
      path: pathSchema,
      title: z.string().optional(),
      format: formatSchema.optional(),
    },
    async ({ path: diagramPath, title, format = "json" }) => {
      try {
        const ext = format === "yaml" ? ".yaml" : ".json";
        const normalizedPath = diagramPath.includes(".")
          ? diagramPath
          : `${diagramPath}${ext}`;
        const document = await store.create(normalizedPath, title);
        return textResult(serializeForResponse(document, format));
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.tool(
    "diagram_get",
    "Read a diagram as a serialized document",
    {
      path: pathSchema,
      format: formatSchema.optional(),
    },
    async ({ path: diagramPath, format = "json" }) => {
      try {
        const document = await store.read(diagramPath);
        return textResult(serializeForResponse(document, format));
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.tool(
    "diagram_replace",
    "Replace an entire diagram document from serialized content",
    {
      path: pathSchema,
      content: z
        .string()
        .describe("Full diagram document as JSON or YAML string"),
      format: formatSchema.optional(),
    },
    async ({ path: diagramPath, content, format = "json" }) => {
      try {
        const { parseDiagram } = await import("@diagram/core");
        const document = parseDiagram(content, format);
        const next = await store.mutate(diagramPath, () =>
          replaceDocument(document, document),
        );
        return textResult(serializeForResponse(next, format));
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.tool(
    "diagram_add_shape",
    "Add a shape to a diagram",
    {
      path: pathSchema,
      type: z.string().describe("Shape type from diagram_list_shape_types"),
      x: z.number(),
      y: z.number(),
      width: z.number().optional(),
      height: z.number().optional(),
      label: z.string().optional(),
      props: z.record(z.unknown()).optional(),
      style: z.record(z.unknown()).optional(),
      metadata: z.record(z.unknown()).optional(),
      id: z.string().optional(),
      groupId: z.string().optional(),
      format: formatSchema.optional(),
    },
    async (input) => {
      try {
        const { path: diagramPath, format = "json", ...shapeInput } = input;
        const document = await store.mutate(diagramPath, (current) =>
          addShape(current, registry, shapeInput),
        );
        return textResult(serializeForResponse(document, format));
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.tool(
    "diagram_update_shape",
    "Update an existing shape by id",
    {
      path: pathSchema,
      shapeId: z.string(),
      updates: z
        .object({
          x: z.number().optional(),
          y: z.number().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          rotation: z.number().optional(),
          zIndex: z.number().optional(),
          label: z.string().optional(),
          props: z.record(z.unknown()).optional(),
          style: z.record(z.unknown()).optional(),
          metadata: z.record(z.unknown()).optional(),
          locked: z.boolean().optional(),
          groupId: z.string().optional(),
        })
        .describe("Partial shape fields to update"),
      format: formatSchema.optional(),
    },
    async ({ path: diagramPath, shapeId, updates, format = "json" }) => {
      try {
        const document = await store.mutate(diagramPath, (current) =>
          updateShape(current, shapeId, updates),
        );
        return textResult(serializeForResponse(document, format));
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.tool(
    "diagram_remove_shape",
    "Remove a shape and its connections from a diagram",
    {
      path: pathSchema,
      shapeId: z.string(),
      format: formatSchema.optional(),
    },
    async ({ path: diagramPath, shapeId, format = "json" }) => {
      try {
        const document = await store.mutate(diagramPath, (current) =>
          removeShape(current, shapeId),
        );
        return textResult(serializeForResponse(document, format));
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.tool(
    "diagram_connect",
    "Connect two shapes with an edge",
    {
      path: pathSchema,
      fromShapeId: z.string(),
      toShapeId: z.string(),
      fromPortId: z.string().optional(),
      toPortId: z.string().optional(),
      type: z.enum(["straight", "orthogonal", "curve"]).optional(),
      label: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
      format: formatSchema.optional(),
    },
    async (input) => {
      try {
        const { path: diagramPath, format = "json", ...connectInput } = input;
        const document = await store.mutate(diagramPath, (current) =>
          connectShapes(current, connectInput),
        );
        return textResult(serializeForResponse(document, format));
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.tool(
    "diagram_update_connection",
    "Update an existing connection by id",
    {
      path: pathSchema,
      connectionId: z.string(),
      updates: z.object({
        fromPortId: z.string().optional(),
        toPortId: z.string().optional(),
        type: z.enum(["straight", "orthogonal", "curve"]).optional(),
        label: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
      format: formatSchema.optional(),
    },
    async ({ path: diagramPath, connectionId, updates, format = "json" }) => {
      try {
        const document = await store.read(diagramPath);
        const connection = document.connections.find(
          (item) => item.id === connectionId,
        );
        if (!connection) {
          return textResult(`Connection "${connectionId}" not found`, true);
        }

        const patched = await store.mutate(diagramPath, (current) =>
          updateConnection(current, connectionId, {
            type: updates.type,
            label: updates.label,
            metadata: updates.metadata,
            from: updates.fromPortId
              ? { ...connection.from, portId: updates.fromPortId }
              : undefined,
            to: updates.toPortId
              ? { ...connection.to, portId: updates.toPortId }
              : undefined,
          }),
        );
        return textResult(serializeForResponse(patched, format));
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.tool(
    "diagram_disconnect",
    "Remove a connection from a diagram",
    {
      path: pathSchema,
      connectionId: z.string(),
      format: formatSchema.optional(),
    },
    async ({ path: diagramPath, connectionId, format = "json" }) => {
      try {
        const document = await store.mutate(diagramPath, (current) =>
          disconnectShapes(current, connectionId),
        );
        return textResult(serializeForResponse(document, format));
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.tool(
    "diagram_create_group",
    "Group multiple shapes together",
    {
      path: pathSchema,
      shapeIds: z.array(z.string()).min(1),
      label: z.string().optional(),
      format: formatSchema.optional(),
    },
    async ({ path: diagramPath, shapeIds, label, format = "json" }) => {
      try {
        const document = await store.mutate(diagramPath, (current) =>
          createGroup(current, { shapeIds, label }),
        );
        return textResult(serializeForResponse(document, format));
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.tool(
    "diagram_set_viewport",
    "Update canvas viewport (pan/zoom)",
    {
      path: pathSchema,
      x: z.number().optional(),
      y: z.number().optional(),
      zoom: z.number().optional(),
      format: formatSchema.optional(),
    },
    async ({ path: diagramPath, x, y, zoom, format = "json" }) => {
      try {
        const document = await store.mutate(diagramPath, (current) =>
          updateViewport(current, { x, y, zoom }),
        );
        return textResult(serializeForResponse(document, format));
      } catch (error) {
        return handleError(error);
      }
    },
  );

  return server;
}
