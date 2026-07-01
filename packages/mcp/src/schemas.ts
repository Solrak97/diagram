import { z } from "zod";
import { DiagramError } from "./store.js";

export const pathSchema = z
  .string()
  .describe("Diagram path relative to workspace root, e.g. diagrams/api.yaml");

export const formatSchema = z
  .enum(["json", "yaml"])
  .default("json")
  .describe("Serialization format");

export function textResult(text: string, isError = false) {
  return {
    content: [{ type: "text" as const, text }],
    isError,
  };
}

export function handleError(error: unknown) {
  if (error instanceof DiagramError) {
    return textResult(error.message, true);
  }
  throw error;
}
