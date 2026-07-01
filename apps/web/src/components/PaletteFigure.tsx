import type { Shape, ShapeTypeDefinition } from "@diagram/core";
import { ShapeGraphics } from "./ShapeGraphics";

const PREVIEW_SIZE = 56;

export function createPalettePreviewShape(
  definition: ShapeTypeDefinition,
  label?: string,
): Shape {
  const inner = PREVIEW_SIZE - 12;
  const scale = Math.min(
    inner / definition.defaultWidth,
    inner / definition.defaultHeight,
    1,
  );
  const width = definition.defaultWidth * scale;
  const height = definition.defaultHeight * scale;

  return {
    id: "__palette__",
    type: definition.type,
    x: (PREVIEW_SIZE - width) / 2,
    y: (PREVIEW_SIZE - height) / 2,
    width,
    height,
    rotation: 0,
    zIndex: 0,
    label,
    props: { ...definition.defaultProps },
    style: { ...definition.defaultStyle },
    metadata: {},
    locked: true,
  };
}

interface PaletteFigureProps {
  definition: ShapeTypeDefinition;
  active: boolean;
  onClick: () => void;
}

export function PaletteFigure({
  definition,
  active,
  onClick,
}: PaletteFigureProps) {
  const preview = createPalettePreviewShape(
    definition,
    definition.type === "text" ? "A" : undefined,
  );
  const tooltip = definition.description
    ? `${definition.label} — ${definition.description}`
    : definition.label;

  return (
    <button
      type="button"
      className={`figure-cell${active ? " active" : ""}`}
      onClick={onClick}
      title={tooltip}
      aria-label={definition.label}
    >
      <svg
        className="figure-preview"
        viewBox={`0 0 ${PREVIEW_SIZE} ${PREVIEW_SIZE}`}
        aria-hidden="true"
      >
        <ShapeGraphics shape={preview} showLabel={definition.type === "text"} />
      </svg>
      <span className="figure-tooltip">{definition.label}</span>
    </button>
  );
}
