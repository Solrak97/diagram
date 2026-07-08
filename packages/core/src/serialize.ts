import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { nanoid } from "nanoid";
import {
  DiagramDocument,
  DiagramDocumentSchema,
  DiagramMetadata,
  ShapeTypeDefinition,
} from "./schema.js";
import { normalizeDocument, prepareForSerialize } from "./pages.js";

export type DiagramFormat = "json" | "yaml";

export function createEmptyDiagram(
  partial?: { metadata?: Partial<DiagramMetadata> },
): DiagramDocument {
  const now = new Date().toISOString();
  const pageId = nanoid(10);
  return DiagramDocumentSchema.parse({
    version: "1",
    metadata: {
      title: partial?.metadata?.title ?? "Untitled diagram",
      description: partial?.metadata?.description,
      createdAt: now,
      updatedAt: now,
      tags: partial?.metadata?.tags ?? [],
    },
    pages: [
      {
        id: pageId,
        name: "Page-1",
        shapes: [],
        connections: [],
        groups: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    ],
    activePageId: pageId,
    shapes: [],
    connections: [],
    groups: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  });
}

export function parseDiagram(
  input: string,
  format: DiagramFormat = "json",
): DiagramDocument {
  const raw =
    format === "yaml"
      ? parseYaml(input)
      : (JSON.parse(input) as unknown);
  return DiagramDocumentSchema.parse(raw);
}

export function parseDiagramNormalized(
  input: string,
  format: DiagramFormat = "json",
): DiagramDocument {
  return normalizeDocument(parseDiagram(input, format));
}

export function serializeDiagram(
  document: DiagramDocument,
  format: DiagramFormat = "json",
): string {
  const validated = DiagramDocumentSchema.parse(prepareForSerialize(document));
  if (format === "yaml") {
    return stringifyYaml(validated);
  }
  return JSON.stringify(validated, null, 2);
}

export function touchDocument(document: DiagramDocument): DiagramDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function exportShapeCatalog(
  registry: { list(): ShapeTypeDefinition[] },
  format: DiagramFormat = "json",
): string {
  const catalog = registry.list().map((shape) => ({
    type: shape.type,
    label: shape.label,
    category: shape.category,
    description: shape.description,
    defaultWidth: shape.defaultWidth,
    defaultHeight: shape.defaultHeight,
    ports: shape.ports,
    defaultProps: shape.defaultProps ?? {},
    defaultStyle: shape.defaultStyle ?? {},
  }));

  if (format === "yaml") {
    return stringifyYaml(catalog);
  }
  return JSON.stringify(catalog, null, 2);
}
