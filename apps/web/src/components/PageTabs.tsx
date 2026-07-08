import { useEffect, useRef, useState } from "react";
import type { DiagramPage } from "@diagram/core";

interface PageTabsProps {
  pages: DiagramPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onRenamePage: (pageId: string, name: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onRemovePage: (pageId: string) => void;
}

export function PageTabs({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDuplicatePage,
  onRemovePage,
}: PageTabsProps) {
  const [menuPageId, setMenuPageId] = useState<string | null>(null);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuPageId) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuPageId(null);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [menuPageId]);

  function startRename(page: DiagramPage) {
    setRenamingPageId(page.id);
    setRenameDraft(page.name);
    setMenuPageId(null);
  }

  function commitRename(pageId: string) {
    const trimmed = renameDraft.trim();
    if (trimmed) {
      onRenamePage(pageId, trimmed);
    }
    setRenamingPageId(null);
  }

  return (
    <div className="page-tabs-bar">
      <div className="page-tabs" role="tablist" aria-label="Diagram pages">
        {pages.map((page) => {
          const active = page.id === activePageId;
          return (
            <div
              key={page.id}
              className={`page-tab${active ? " active" : ""}`}
              role="presentation"
            >
              {renamingPageId === page.id ? (
                <input
                  className="page-tab-rename"
                  value={renameDraft}
                  autoFocus
                  onChange={(event) => setRenameDraft(event.target.value)}
                  onBlur={() => commitRename(page.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitRename(page.id);
                    if (event.key === "Escape") setRenamingPageId(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className="page-tab-button"
                  onClick={() => onSelectPage(page.id)}
                  onDoubleClick={() => startRename(page)}
                >
                  {page.name}
                </button>
              )}

              <button
                type="button"
                className="page-tab-menu-trigger"
                aria-label={`Page options for ${page.name}`}
                onClick={() =>
                  setMenuPageId((current) =>
                    current === page.id ? null : page.id,
                  )
                }
              >
                ⋮
              </button>

              {menuPageId === page.id ? (
                <div className="page-tab-menu" ref={menuRef} role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => startRename(page)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onDuplicatePage(page.id);
                      setMenuPageId(null);
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pages.length <= 1}
                    onClick={() => {
                      onRemovePage(page.id);
                      setMenuPageId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="page-tab-add"
        title="Insert page"
        aria-label="Insert page"
        onClick={onAddPage}
      >
        +
      </button>
    </div>
  );
}
