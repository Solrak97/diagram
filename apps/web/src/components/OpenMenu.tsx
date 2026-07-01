import { useEffect, useRef, useState } from "react";
import type { LibraryDiagramEntry } from "../utils/load";
import { fetchLibraryManifest } from "../utils/load";
import { OpenIcon } from "./ToolbarIcons";

interface OpenMenuProps {
  onOpenFile: () => void;
  onOpenLibrary: (entry: LibraryDiagramEntry) => void;
  busy?: boolean;
}

export function OpenMenu({
  onOpenFile,
  onOpenLibrary,
  busy = false,
}: OpenMenuProps) {
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState<LibraryDiagramEntry[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void fetchLibraryManifest()
      .then((manifest) => {
        if (!cancelled) {
          setLibrary(manifest.diagrams);
          setLibraryError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLibrary([]);
          setLibraryError("Library unavailable");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

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
    <div className="menu-anchor open-menu" ref={rootRef}>
      <button
        type="button"
        className={`tool-btn icon-btn${open ? " active" : ""}`}
        title="Open diagram"
        aria-label="Open diagram"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        <OpenIcon />
      </button>

      {open ? (
        <div className="toolbar-dropdown open-dropdown" role="menu">
          <button
            type="button"
            className="toolbar-dropdown-item"
            role="menuitem"
            disabled={busy}
            onClick={() => {
              onOpenFile();
              setOpen(false);
            }}
          >
            Open file…
          </button>

          <div className="toolbar-dropdown-section">Library</div>

          {libraryError ? (
            <div className="toolbar-dropdown-empty">{libraryError}</div>
          ) : null}

          {library.map((entry) => (
            <button
              key={entry.path}
              type="button"
              className="toolbar-dropdown-item library-item"
              role="menuitem"
              disabled={busy}
              title={entry.description}
              onClick={() => {
                onOpenLibrary(entry);
                setOpen(false);
              }}
            >
              <span className="library-item-title">{entry.title}</span>
              {entry.description ? (
                <span className="library-item-description">{entry.description}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
