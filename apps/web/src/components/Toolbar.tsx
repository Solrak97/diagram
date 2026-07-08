import type { ExportAction } from "./ExportMenu";
import type { EditorTool } from "../types/editor";
import {
  ConnectIcon,
  DrawIcon,
  MultiselectIcon,
  PanIcon,
  RedoIcon,
  SelectIcon,
  ShapeIcon,
  TextIcon,
  UndoIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "./ToolbarIcons";

interface ToolbarProps {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  zoom: number;
  lineFormatControls?: React.ReactNode;
}

const TOOLS: {
  id: EditorTool;
  label: string;
  title: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "select",
    label: "Select",
    title: "Select and move (V)",
    icon: <SelectIcon />,
  },
  {
    id: "multiselect",
    label: "Multi-select",
    title: "Select multiple shapes — drag marquee or click to toggle (M)",
    icon: <MultiselectIcon />,
  },
  {
    id: "pan",
    label: "Pan",
    title: "Pan canvas (H)",
    icon: <PanIcon />,
  },
  {
    id: "shape",
    label: "Shape",
    title: "Draw shapes — pick from palette (S)",
    icon: <ShapeIcon />,
  },
  {
    id: "draw",
    label: "Draw",
    title: "Freehand vector draw (D)",
    icon: <DrawIcon />,
  },
  {
    id: "text",
    label: "Text",
    title: "Place text labels (T)",
    icon: <TextIcon />,
  },
  {
    id: "connect",
    label: "Connect",
    title: "Connect two shapes (C)",
    icon: <ConnectIcon />,
  },
];

export function Toolbar({
  tool,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  zoom,
  lineFormatControls,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="tool-group" role="toolbar" aria-label="Drawing tools">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tool-btn icon-btn${tool === item.id ? " active" : ""}`}
            title={item.title}
            aria-label={item.label}
            onClick={() => onToolChange(item.id)}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <div className="tool-divider" />

      <div className="tool-group" role="group" aria-label="Zoom">
        <button
          type="button"
          className="tool-btn icon-btn"
          title="Zoom out"
          aria-label="Zoom out"
          onClick={onZoomOut}
        >
          <ZoomOutIcon />
        </button>
        <button
          type="button"
          className="tool-btn zoom-label"
          title="Reset zoom"
          aria-label="Reset zoom"
          onClick={onZoomReset}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="tool-btn icon-btn"
          title="Zoom in"
          aria-label="Zoom in"
          onClick={onZoomIn}
        >
          <ZoomInIcon />
        </button>
      </div>

      <div className="tool-divider" />

      <div className="tool-group" role="group" aria-label="History">
        <button
          type="button"
          className="tool-btn icon-btn"
          title="Undo (⌘Z)"
          aria-label="Undo"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="tool-btn icon-btn"
          title="Redo (⌘⇧Z)"
          aria-label="Redo"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <RedoIcon />
        </button>
      </div>

      {lineFormatControls ? (
        <>
          <div className="tool-divider" />
          {lineFormatControls}
        </>
      ) : null}
    </div>
  );
}

export type { ExportAction };
