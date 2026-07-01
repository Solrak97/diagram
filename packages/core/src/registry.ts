import { ShapeRegistry, ShapeTypeDefinition } from "./schema.js";

export interface MutableShapeRegistry extends ShapeRegistry {
  register(definition: ShapeTypeDefinition): void;
  unregister(type: string): boolean;
}

export function createRegistry(
  initial: ShapeTypeDefinition[] = [],
): MutableShapeRegistry {
  const definitions = new Map<string, ShapeTypeDefinition>();

  for (const definition of initial) {
    definitions.set(definition.type, definition);
  }

  return {
    get(type: string) {
      return definitions.get(type);
    },
    list() {
      return [...definitions.values()].sort((a, b) =>
        a.category === b.category
          ? a.label.localeCompare(b.label)
          : a.category.localeCompare(b.category),
      );
    },
    register(definition: ShapeTypeDefinition) {
      if (definitions.has(definition.type)) {
        throw new Error(`Shape type "${definition.type}" is already registered`);
      }
      definitions.set(definition.type, definition);
    },
    unregister(type: string) {
      return definitions.delete(type);
    },
  };
}

export const defaultShapeRegistry = createRegistry();
