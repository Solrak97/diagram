import { useEffect, useRef, useState } from "react";

interface ToolbarTitleProps {
  title: string;
  onChange: (title: string) => void;
}

export function ToolbarTitle({ title, onChange }: ToolbarTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const next = draft.trim() || "Untitled diagram";
    onChange(next);
    setDraft(next);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="toolbar-title-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
        }}
        aria-label="Diagram title"
      />
    );
  }

  return (
    <button
      type="button"
      className="toolbar-title"
      onDoubleClick={() => setEditing(true)}
      title="Double-click to rename"
    >
      {title}
    </button>
  );
}
