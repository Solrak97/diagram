import { useEffect, useRef, useState, type ReactNode } from "react";

export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  checked?: boolean;
  children?: MenuItem[];
  onSelect?: () => void;
}

interface MenuBarProps {
  items: { id: string; label: string; items: MenuItem[] }[];
}

function MenuDropdown({
  label,
  items,
  open,
  onToggle,
  onClose,
}: {
  label: string;
  items: MenuItem[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [onClose, open]);

  return (
    <div className="menubar-anchor" ref={rootRef}>
      <button
        type="button"
        className={`menubar-trigger${open ? " active" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
      >
        {label}
      </button>

      {open ? (
        <div className="menubar-dropdown" role="menu">
          {items.map((item) =>
            item.separator ? (
              <div key={item.id} className="menubar-separator" role="separator" />
            ) : (
              <button
                key={item.id}
                type="button"
                className="menubar-item"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect?.();
                  onClose();
                }}
              >
                <span className="menubar-item-label">
                  {item.checked ? "✓ " : ""}
                  {item.label}
                </span>
                {item.shortcut ? (
                  <span className="menubar-item-shortcut">{item.shortcut}</span>
                ) : null}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

export function MenuBar({ items }: MenuBarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <nav className="menubar" aria-label="Application menu">
      {items.map((menu) => (
        <MenuDropdown
          key={menu.id}
          label={menu.label}
          items={menu.items}
          open={openMenuId === menu.id}
          onToggle={() =>
            setOpenMenuId((current) => (current === menu.id ? null : menu.id))
          }
          onClose={() => setOpenMenuId(null)}
        />
      ))}
    </nav>
  );
}

export function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <div className="menubar-section">{title}</div>
      {children}
    </>
  );
}
