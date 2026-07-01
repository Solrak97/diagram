import type { LineStyle } from "../utils/lines";

interface LineFormatBarProps {
  lineStyle: LineStyle;
  onChange: (style: LineStyle) => void;
}

const STYLES: { id: LineStyle; label: string; title: string }[] = [
  { id: "solid", label: "Solid", title: "Solid line" },
  { id: "dashed", label: "Dashed", title: "Dashed line" },
  { id: "dotted", label: "Dotted", title: "Dotted line" },
];

export function LineFormatBar({ lineStyle, onChange }: LineFormatBarProps) {
  return (
    <div className="tool-group line-format-bar" role="group" aria-label="Line style">
      {STYLES.map((style) => (
        <button
          key={style.id}
          type="button"
          className={`tool-btn line-style-btn${lineStyle === style.id ? " active" : ""}`}
          title={style.title}
          aria-label={style.title}
          onClick={() => onChange(style.id)}
        >
          <span className={`line-style-preview ${style.id}`} aria-hidden="true" />
          <span className="line-style-label">{style.label}</span>
        </button>
      ))}
    </div>
  );
}
