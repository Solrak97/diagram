import fs from "node:fs/promises";
import path from "node:path";
import {
  DiagramDocument,
  DiagramFormat,
  addShape,
  connectShapes,
  createEmptyDiagram,
  createGroup,
  defaultShapeRegistry,
  disconnectShapes,
  exportShapeCatalog,
  parseDiagram,
  removeShape,
  replaceDocument,
  serializeDiagram,
  touchDocument,
  updateConnection,
  updateShape,
  updateViewport,
  DiagramError,
} from "@diagram/core";
import "@diagram/shapes";

export interface DiagramStoreOptions {
  workspaceRoot: string;
}

export class DiagramStore {
  private readonly workspaceRoot: string;

  constructor(options: DiagramStoreOptions) {
    this.workspaceRoot = options.workspaceRoot;
  }

  resolvePath(relativePath: string): string {
    const resolved = path.resolve(this.workspaceRoot, relativePath);
    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new DiagramError("Path escapes workspace root");
    }
    return resolved;
  }

  async read(relativePath: string): Promise<DiagramDocument> {
    const filePath = this.resolvePath(relativePath);
    const content = await fs.readFile(filePath, "utf8");
    const format = relativePath.endsWith(".yaml") || relativePath.endsWith(".yml")
      ? "yaml"
      : "json";
    return parseDiagram(content, format);
  }

  async write(relativePath: string, document: DiagramDocument): Promise<void> {
    const filePath = this.resolvePath(relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const format = relativePath.endsWith(".yaml") || relativePath.endsWith(".yml")
      ? "yaml"
      : "json";
    await fs.writeFile(filePath, serializeDiagram(document, format), "utf8");
  }

  async create(
    relativePath: string,
    title?: string,
  ): Promise<DiagramDocument> {
    const filePath = this.resolvePath(relativePath);
    try {
      await fs.access(filePath);
      throw new DiagramError(`Diagram already exists at "${relativePath}"`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const document = createEmptyDiagram({
      metadata: { title: title ?? "Untitled diagram" },
    });
    await this.write(relativePath, document);
    return document;
  }

  async mutate(
    relativePath: string,
    mutator: (document: DiagramDocument) => DiagramDocument,
  ): Promise<DiagramDocument> {
    const current = await this.read(relativePath);
    const next = mutator(current);
    await this.write(relativePath, next);
    return next;
  }
}

export function getRegistry() {
  return defaultShapeRegistry;
}

export function serializeForResponse(
  document: DiagramDocument,
  format: DiagramFormat = "json",
): string {
  return serializeDiagram(document, format);
}

export function exportCatalog(format: DiagramFormat = "json"): string {
  return exportShapeCatalog(defaultShapeRegistry, format);
}

export {
  addShape,
  connectShapes,
  createEmptyDiagram,
  createGroup,
  disconnectShapes,
  parseDiagram,
  removeShape,
  replaceDocument,
  serializeDiagram,
  touchDocument,
  updateConnection,
  updateShape,
  updateViewport,
  DiagramError,
};

export type { DiagramDocument, DiagramFormat };
