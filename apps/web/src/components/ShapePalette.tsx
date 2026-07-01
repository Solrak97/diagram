import type { ShapeRegistry } from "@diagram/core";
import type { PalettePanel } from "@diagram/shapes";
import type { EditorTool } from "../types/editor";
import { PalettePanelSection } from "./PalettePanelSection";

interface ShapePaletteProps {
  panels: PalettePanel[];
  registry: ShapeRegistry;
  activeShapeType: string;
  tool: EditorTool;
  onSelectShapeType: (type: string) => void;
  onArmShapeTool: () => void;
  onArmTextTool: () => void;
}

export function ShapePalette({
  panels,
  registry,
  activeShapeType,
  tool,
  onSelectShapeType,
  onArmShapeTool,
  onArmTextTool,
}: ShapePaletteProps) {
  function select(type: string) {
    onSelectShapeType(type);
    if (type === "text") {
      onArmTextTool();
    } else {
      onArmShapeTool();
    }
  }

  return (
    <aside className="sidebar palette-sidebar">
      <h1>Figures</h1>

      <div className="palette-panels">
        {panels.map((panel) => (
          <PalettePanelSection
            key={panel.id}
            panel={panel}
            registry={registry}
            activeShapeType={activeShapeType}
            tool={tool}
            onSelect={select}
          />
        ))}
      </div>
    </aside>
  );
}
