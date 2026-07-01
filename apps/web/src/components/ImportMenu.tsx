import { useEffect, useRef, useState } from "react";
import type { LibraryDiagramEntry } from "../utils/load";
import { fetchLibraryManifest } from "../utils/load";
import { ImportIcon } from "./ToolbarIcons";

interface ImportMenuProps {
  onImportFile: () => void;
  onImportLibrary: (entry: LibraryDiagramEntry) => void;
  busy?: boolean;
}

export function ImportMenu({
  onImportFile,
  onImportLibrary,
  busy = false,
}: ImportMenuProps) {
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
    <div className="menu-anchor import-menu" ref={rootRef}>
      <button
        type="button"
        className={`tool-btn icon-btn${open ? " active" : ""}`}
        title="Import into diagram"
        aria-label="Import into diagram"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        <ImportIcon />
      </button>

      {open ? (
        <div className="toolbar-dropdown import-dropdown" role="menu">
          <button
            type="button"
            className="toolbar-dropdown-item"
            role="menuitem"
            disabled={busy}
            onClick={() => {
              onImportFile();
              setOpen(false);
            }}
          >
            Import file…
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
                onImportLibrary(entry);
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
