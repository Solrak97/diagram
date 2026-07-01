import { useState } from "react";
import type { ShapeRegistry } from "@diagram/core";
import type { PalettePanel } from "@diagram/shapes";
import type { EditorTool } from "../types/editor";
import { PaletteFigure } from "./PaletteFigure";

interface PalettePanelSectionProps {
  panel: PalettePanel;
  registry: ShapeRegistry;
  activeShapeType: string;
  tool: EditorTool;
  onSelect: (type: string) => void;
}

export function PalettePanelSection({
  panel,
  registry,
  activeShapeType,
  tool,
  onSelect,
}: PalettePanelSectionProps) {
  const [open, setOpen] = useState(panel.defaultOpen ?? true);

  return (
    <section className="palette-panel">
      <button
        type="button"
        className={`palette-panel-header${open ? " open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>{panel.label}</span>
        <span className="palette-panel-chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div className="figure-grid palette-panel-grid">
          {panel.items.map((item, index) => {
            const definition = registry.get(item.type);
            if (!definition) return null;

            const display = item.label
              ? { ...definition, label: item.label }
              : definition;

            const active =
              item.type === "text"
                ? tool === "text"
                : tool === "shape" && activeShapeType === item.type;

            return (
              <PaletteFigure
                key={`${panel.id}-${item.type}-${item.label ?? index}`}
                definition={display}
                active={active}
                onClick={() => onSelect(item.type)}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
