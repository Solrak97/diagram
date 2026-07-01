import {
  type DiagramDocument,
  parseDiagram,
  serializeDiagram,
} from "@diagram/core";
import type { DocumentSource } from "./load";

const STORAGE_KEY = "diagram:document";
const SOURCE_KEY = "diagram:source";

export function loadStoredDocument(): DiagramDocument | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseDiagram(raw, "json");
  } catch {
    return null;
  }
}

export function saveStoredDocument(document: DiagramDocument): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeDiagram(document, "json"));
  } catch (error) {
    console.warn("Failed to save diagram to local storage", error);
  }
}

export function clearStoredDocument(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SOURCE_KEY);
}

export function loadStoredSource(): DocumentSource | null {
  try {
    const raw = localStorage.getItem(SOURCE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DocumentSource;
  } catch {
    return null;
  }
}

export function saveStoredSource(source: DocumentSource | null): void {
  try {
    if (!source) {
      localStorage.removeItem(SOURCE_KEY);
      return;
    }
    localStorage.setItem(SOURCE_KEY, JSON.stringify(source));
  } catch (error) {
    console.warn("Failed to save diagram source to local storage", error);
  }
}
