import type { LinePoint } from "../utils/lines";

interface LinePivotHandlesProps {
  points: LinePoint[];
  zoom: number;
  selectedPivotIndex: number | null;
  onPivotSelect: (index: number) => void;
  onPivotDragStart: (index: number) => void;
}

export function LinePivotHandles({
  points,
  zoom,
  selectedPivotIndex,
  onPivotSelect,
  onPivotDragStart,
}: LinePivotHandlesProps) {
  const size = 7 / zoom;

  return (
    <g className="line-pivot-handles">
      {points.map((point, index) => {
        const isEndpoint = index === 0 || index === points.length - 1;
        const selected = selectedPivotIndex === index;

        return (
          <circle
            key={`${index}-${point.x}-${point.y}`}
            className={`line-pivot-handle${selected ? " selected" : ""}${
              isEndpoint ? " endpoint" : ""
            }`}
            cx={point.x}
            cy={point.y}
            r={size}
            onMouseDown={(event) => {
              event.stopPropagation();
              onPivotSelect(index);
              onPivotDragStart(index);
            }}
          />
        );
      })}
    </g>
  );
}
