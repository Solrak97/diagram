import { type DiagramDocument, parseDiagram } from "@diagram/core";

export interface LibraryDiagramEntry {
  path: string;
  title: string;
  description?: string;
}

export interface DiagramLibraryManifest {
  diagrams: LibraryDiagramEntry[];
}

export interface DocumentSource {
  kind: "library" | "file";
  path: string;
  label: string;
}

export function inferDiagramFormat(
  pathOrName: string,
  content?: string,
): "json" | "yaml" {
  const lower = pathOrName.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "yaml";

  const trimmed = content?.trim();
  if (trimmed?.startsWith("{") || trimmed?.startsWith("[")) return "json";
  return "yaml";
}

export function parseDiagramContent(
  content: string,
  pathOrName: string,
): DiagramDocument {
  return parseDiagram(content, inferDiagramFormat(pathOrName, content));
}

export async function fetchLibraryManifest(): Promise<DiagramLibraryManifest> {
  const response = await fetch("/diagrams/manifest.json");
  if (!response.ok) {
    throw new Error("Failed to load diagram library");
  }
  return (await response.json()) as DiagramLibraryManifest;
}

export async function fetchLibraryDiagram(path: string): Promise<DiagramDocument> {
  const normalized = path.replace(/^\/+/, "");
  const response = await fetch(`/diagrams/${normalized}`);
  if (!response.ok) {
    throw new Error(`Diagram not found: ${normalized}`);
  }
  const content = await response.text();
  return parseDiagramContent(content, normalized);
}

export function readDiagramFile(file: File): Promise<DiagramDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = String(reader.result ?? "");
        resolve(parseDiagramContent(content, file.name));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function isBlankDocument(document: DiagramDocument): boolean {
  return (
    document.shapes.length === 0 &&
    document.connections.length === 0 &&
    document.metadata.title === "Untitled diagram"
  );
}
