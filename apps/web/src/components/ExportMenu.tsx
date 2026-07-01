import { useEffect, useRef, useState } from "react";
import { ExportIcon } from "./ToolbarIcons";

export type ExportAction = "yaml" | "json" | "png" | "jpeg";

interface ExportMenuProps {
  onExport: (action: ExportAction) => void;
  busy?: boolean;
}

const ITEMS: { id: ExportAction; label: string }[] = [
  { id: "yaml", label: "YAML (.yaml)" },
  { id: "json", label: "JSON (.json)" },
  { id: "png", label: "PNG image" },
  { id: "jpeg", label: "JPEG image" },
];

export function ExportMenu({ onExport, busy = false }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="export-menu" ref={rootRef}>
      <button
        type="button"
        className={`tool-btn icon-btn${open ? " active" : ""}`}
        title="Export diagram"
        aria-label="Export diagram"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        <ExportIcon />
      </button>

      {open ? (
        <div className="export-dropdown" role="menu">
          {ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="export-item"
              role="menuitem"
              disabled={busy}
              onClick={() => {
                onExport(item.id);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
