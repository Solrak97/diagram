import {
  type DiagramDocument,
  addShape,
  connectShapes,
  createEmptyDiagram,
  defaultShapeRegistry,
  disconnectShapes,
  importDocument,
  removeShape,
  serializeDiagram,
  updateShape,
  updateViewport,
  touchDocument,
  addPage,
  duplicatePage,
  mutateActivePage,
  normalizeDocument,
  removePage,
  renamePage,
  setActivePage,
} from "@diagram/core";
import "@diagram/shapes";
import { palettePanels } from "@diagram/shapes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DiagramCanvas } from "./components/DiagramCanvas";
import { ShapePalette } from "./components/ShapePalette";
import { Toolbar } from "./components/Toolbar";
import { LineFormatBar } from "./components/LineFormatBar";
import { MenuBar, type MenuItem } from "./components/MenuBar";
import { PageTabs } from "./components/PageTabs";
import type { ExportAction } from "./components/Toolbar";
import type { EditorTool, PendingConnection } from "./types/editor";
import { ToolbarTitle } from "./components/ToolbarTitle";
import { useDiagramHistory } from "./hooks/useDiagramHistory";
import {
  diagramToClient,
  getPinchZoomFactor,
  getWheelPanDelta,
  isPinchZoomWheel,
  ZOOM_STEP,
  zoomViewportByFactor,
} from "./utils/canvas";
import {
  exportDiagramJpeg,
  exportDiagramPng,
  exportDiagramText,
} from "./utils/export";
import {
  type DocumentSource,
  fetchLibraryDiagram,
  fetchLibraryManifest,
  isBlankDocument,
  readDiagramFile,
} from "./utils/load";
import type { LibraryDiagramEntry } from "./utils/load";
import {
  getLineStyle,
  getLinePathPoints,
  initializeLineShapePoints,
  insertPivotAtPoint,
  isPointPathShape,
  isLineShape,
  removePivotAtIndex,
  syncShapeFromLinePoints,
  syncShapeFromPathPoints,
  type LinePoint,
  type LineStyle,
  translateLinePoints,
  translatePathPoints,
} from "./utils/lines";
import {
  loadStoredDocument,
  loadStoredSource,
  saveStoredDocument,
  saveStoredSource,
} from "./utils/storage";

function loadInitialDocument(): DiagramDocument {
  return createEmptyDiagram({
    metadata: { title: "Untitled diagram", tags: [] },
  });
}

export function App() {
  const {
    document: rawDocument,
    canUndo,
    canRedo,
    mutate: historyMutate,
    replaceDocument,
    undo,
    redo,
  } = useDiagramHistory(loadStoredDocument() ?? loadInitialDocument());
  const document = useMemo(
    () => normalizeDocument(rawDocument),
    [rawDocument],
  );
  const mutate = useCallback(
    (
      updater: (current: DiagramDocument) => DiagramDocument,
      options?: { recordHistory?: boolean },
    ) => {
      historyMutate(
        (current) => mutateActivePage(current, updater),
        options,
      );
    },
    [historyMutate],
  );
  const mutateViewport = useCallback(
    (updater: (current: DiagramDocument) => DiagramDocument) => {
      historyMutate((current) => mutateActivePage(current, updater), {
        recordHistory: false,
      });
    },
    [historyMutate],
  );
  const [documentSource, setDocumentSource] = useState<DocumentSource | null>(
    () => loadStoredSource(),
  );
  const [fileBusy, setFileBusy] = useState(false);
  const [tool, setTool] = useState<EditorTool>("select");
  const [activeShapeType, setActiveShapeType] = useState("rounded-rectangle");
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(
    null,
  );
  const [pendingConnection, setPendingConnection] =
    useState<PendingConnection | null>(null);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const canvasShellRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const canvasSvgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputModeRef = useRef<"open" | "import">("open");
  const [exportBusy, setExportBusy] = useState(false);
  const [showPalette, setShowPalette] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [library, setLibrary] = useState<LibraryDiagramEntry[]>([]);
  const [selectedLinePivotIndex, setSelectedLinePivotIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    setSelectedLinePivotIndex(null);
  }, [selectedShapeIds]);

  useEffect(() => {
    void fetchLibraryManifest()
      .then((manifest) => setLibrary(manifest.diagrams))
      .catch(() => setLibrary([]));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedShapeIds([]);
    setSelectedConnectionId(null);
    setPendingConnection(null);
    setEditingShapeId(null);
    setSelectedLinePivotIndex(null);
  }, []);

  const applyDocument = useCallback(
    (next: DiagramDocument, source: DocumentSource | null) => {
      replaceDocument(normalizeDocument(next));
      setDocumentSource(source);
      clearSelection();
      saveStoredDocument(normalizeDocument(next));
      saveStoredSource(source);
    },
    [clearSelection, replaceDocument],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveStoredDocument(document);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [document]);

  useEffect(() => {
    saveStoredSource(documentSource);
  }, [documentSource]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const openParam = new URLSearchParams(window.location.search).get("open");
      if (openParam) {
        try {
          const doc = await fetchLibraryDiagram(openParam);
          if (cancelled) return;
          applyDocument(doc, {
            kind: "library",
            path: openParam,
            label: doc.metadata.title,
          });
          const url = new URL(window.location.href);
          url.searchParams.delete("open");
          window.history.replaceState({}, "", url);
          return;
        } catch (error) {
          console.error("Failed to open diagram from URL", error);
        }
      }

      const stored = loadStoredDocument();
      if (stored && !isBlankDocument(stored)) {
        return;
      }

      try {
        const doc = await fetchLibraryDiagram("login-sequence.yaml");
        if (cancelled) return;
        applyDocument(doc, {
          kind: "library",
          path: "login-sequence.yaml",
          label: doc.metadata.title,
        });
      } catch (error) {
        console.error("Failed to load default diagram", error);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyDocument]);

  const selectedShape =
    selectedShapeIds.length === 1
      ? document.shapes.find((shape) => shape.id === selectedShapeIds[0])
      : undefined;
  const selectedLineShape =
    selectedShape && isLineShape(selectedShape.type) ? selectedShape : undefined;
  const multiSelectCount = selectedShapeIds.length;
  const selectedConnection = document.connections.find(
    (connection) => connection.id === selectedConnectionId,
  );
  const editingShape = document.shapes.find((shape) => shape.id === editingShapeId);

  const applyZoom = useCallback(
    (focalClientX: number, focalClientY: number, factor: number) => {
      const area = canvasAreaRef.current?.getBoundingClientRect();
      if (!area) return;

      mutateViewport((current) =>
        updateViewport(
          current,
          zoomViewportByFactor(
            current.viewport,
            factor,
            focalClientX,
            focalClientY,
            area,
          ),
        ),
      );
    },
    [mutateViewport],
  );

  const handleZoomIn = useCallback(() => {
    const area = canvasAreaRef.current?.getBoundingClientRect();
    if (!area) return;
    applyZoom(area.left + area.width / 2, area.top + area.height / 2, ZOOM_STEP);
  }, [applyZoom]);

  const handleZoomOut = useCallback(() => {
    const area = canvasAreaRef.current?.getBoundingClientRect();
    if (!area) return;
    applyZoom(
      area.left + area.width / 2,
      area.top + area.height / 2,
      1 / ZOOM_STEP,
    );
  }, [applyZoom]);

  const handleZoomReset = useCallback(() => {
    mutateViewport((current) => updateViewport(current, { zoom: 1, x: 0, y: 0 }));
  }, [mutateViewport]);

  const handleExport = useCallback(
    async (action: ExportAction) => {
      try {
        setExportBusy(true);
        if (action === "yaml") {
          exportDiagramText(
            serializeDiagram(document, "yaml"),
            document,
            "yaml",
          );
          return;
        }
        if (action === "json") {
          exportDiagramText(
            serializeDiagram(document, "json"),
            document,
            "json",
          );
          return;
        }

        const svg = canvasSvgRef.current;
        if (!svg) return;

        if (action === "png") {
          await exportDiagramPng(svg, document);
        } else {
          await exportDiagramJpeg(svg, document);
        }
      } catch (error) {
        console.error("Export failed", error);
        window.alert("Export failed. Try again.");
      } finally {
        setExportBusy(false);
      }
    },
    [document],
  );

  const handleDelete = useCallback(() => {
    if (
      selectedLineShape &&
      selectedLinePivotIndex !== null &&
      selectedShapeIds.length === 1
    ) {
      const points = removePivotAtIndex(
        getLinePathPoints(selectedLineShape),
        selectedLinePivotIndex,
      );
      if (points.length !== getLinePathPoints(selectedLineShape).length) {
        mutate((current) => {
          const nextShape = syncShapeFromLinePoints(selectedLineShape, points);
          return updateShape(current, selectedLineShape.id, {
            x: nextShape.x,
            y: nextShape.y,
            width: nextShape.width,
            height: nextShape.height,
            props: nextShape.props,
          });
        });
        setSelectedLinePivotIndex(null);
        return;
      }
    }

    if (selectedShapeIds.length > 0) {
      const ids = [...selectedShapeIds];
      mutate((current) =>
        ids.reduce((doc, id) => removeShape(doc, id), current),
      );
      setSelectedShapeIds([]);
      setSelectedLinePivotIndex(null);
      return;
    }
    if (selectedConnectionId) {
      const id = selectedConnectionId;
      mutate((current) => disconnectShapes(current, id));
      setSelectedConnectionId(null);
    }
  }, [
    mutate,
    selectedConnectionId,
    selectedLinePivotIndex,
    selectedLineShape,
    selectedShapeIds,
  ]);

  const handleToggleShape = useCallback((shapeId: string) => {
    setSelectedShapeIds((current) =>
      current.includes(shapeId)
        ? current.filter((id) => id !== shapeId)
        : [...current, shapeId],
    );
    setSelectedConnectionId(null);
  }, []);

  const handleConnectPick = useCallback(
    (shapeId: string, portId?: string) => {
      if (!pendingConnection) {
        setPendingConnection({ shapeId, portId });
        return;
      }

      if (pendingConnection.shapeId === shapeId) {
        setPendingConnection(null);
        return;
      }

      mutate((current) =>
        connectShapes(current, {
          fromShapeId: pendingConnection.shapeId,
          toShapeId: shapeId,
          fromPortId: pendingConnection.portId,
          toPortId: portId,
          type: "orthogonal",
        }),
      );
      setPendingConnection(null);
      setTool("select");
    },
    [mutate, pendingConnection],
  );

  const handleCreateShape = useCallback(
    (
      bounds: { x: number; y: number; width: number; height: number },
      type: string,
    ) => {
      const definition = defaultShapeRegistry.get(type);
      const label =
        type === "text"
          ? "Label"
          : (definition?.label ?? type.replace(/-/g, " "));

      mutate((current) => {
        let next = addShape(current, defaultShapeRegistry, {
          type,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          label,
        });
        const created = next.shapes[next.shapes.length - 1];
        if (created && isLineShape(type)) {
          const initialized = initializeLineShapePoints(created);
          next = {
            ...next,
            shapes: next.shapes.map((shape) =>
              shape.id === created.id ? initialized : shape,
            ),
          };
        }
        if (created) {
          setSelectedShapeIds([created.id]);
          setSelectedLinePivotIndex(null);
        }
        return next;
      });

      if (type === "text") {
        setTool("select");
      }
    },
    [mutate],
  );

  const handleCreateFreehand = useCallback(
    (points: LinePoint[]) => {
      if (points.length < 2) return;

      mutate((current) => {
        let next = addShape(current, defaultShapeRegistry, {
          type: "freehand",
          x: points[0].x,
          y: points[0].y,
          width: 1,
          height: 1,
          label: undefined,
        });
        const created = next.shapes[next.shapes.length - 1];
        if (!created) return next;

        const finalized = syncShapeFromPathPoints(created, points);
        next = {
          ...next,
          shapes: next.shapes.map((shape) =>
            shape.id === created.id ? finalized : shape,
          ),
        };
        setSelectedShapeIds([created.id]);
        setSelectedLinePivotIndex(null);
        return next;
      });

      setTool("select");
    },
    [mutate],
  );

  const handleUpdateLinePoints = useCallback(
    (shapeId: string, points: LinePoint[]) => {
      mutate((current) => {
        const shape = current.shapes.find((item) => item.id === shapeId);
        if (!shape) return current;
        const nextShape = syncShapeFromLinePoints(shape, points);
        return updateShape(current, shapeId, {
          x: nextShape.x,
          y: nextShape.y,
          width: nextShape.width,
          height: nextShape.height,
          props: nextShape.props,
        });
      });
    },
    [mutate],
  );

  const handleAddLinePivot = useCallback(
    (shapeId: string, x: number, y: number) => {
      mutate((current) => {
        const shape = current.shapes.find((item) => item.id === shapeId);
        if (!shape || !isLineShape(shape.type)) return current;
        const points = insertPivotAtPoint(getLinePathPoints(shape), x, y);
        const nextShape = syncShapeFromLinePoints(shape, points);
        return updateShape(current, shapeId, {
          x: nextShape.x,
          y: nextShape.y,
          width: nextShape.width,
          height: nextShape.height,
          props: nextShape.props,
        });
      });
    },
    [mutate],
  );

  const handleLineStyleChange = useCallback(
    (lineStyle: LineStyle) => {
      if (!selectedLineShape) return;
      mutate((current) =>
        updateShape(current, selectedLineShape.id, {
          props: {
            ...selectedLineShape.props,
            lineStyle,
          },
        }),
      );
    },
    [mutate, selectedLineShape],
  );

  const commitLabelEdit = useCallback(() => {
    if (!editingShapeId) return;
    mutate((current) =>
      updateShape(current, editingShapeId, { label: labelDraft }),
    );
    setEditingShapeId(null);
  }, [editingShapeId, labelDraft, mutate]);

  const handleOpenFile = useCallback(() => {
    fileInputModeRef.current = "open";
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(() => {
    fileInputModeRef.current = "import";
    fileInputRef.current?.click();
  }, []);

  const importIntoDocument = useCallback(
    (source: DiagramDocument) => {
      let importedShapeIds: string[] = [];
      mutate((current) => {
        const result = importDocument(current, source);
        importedShapeIds = result.importedShapeIds;
        return result.document;
      });
      if (importedShapeIds.length > 0) {
        setSelectedShapeIds(importedShapeIds);
        setSelectedConnectionId(null);
      }
    },
    [mutate],
  );

  const handleFileInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      const mode = fileInputModeRef.current;

      try {
        setFileBusy(true);
        const doc = await readDiagramFile(file);
        if (mode === "open") {
          applyDocument(doc, {
            kind: "file",
            path: file.name,
            label: file.name,
          });
          return;
        }

        importIntoDocument(doc);
      } catch (error) {
        console.error(`Failed to ${mode} diagram file`, error);
        window.alert(
          mode === "open"
            ? "Could not open diagram file. Use JSON or YAML."
            : "Could not import diagram file. Use JSON or YAML.",
        );
      } finally {
        setFileBusy(false);
      }
    },
    [applyDocument, importIntoDocument],
  );

  const handleOpenLibrary = useCallback(
    async (entry: LibraryDiagramEntry) => {
      try {
        setFileBusy(true);
        const doc = await fetchLibraryDiagram(entry.path);
        applyDocument(doc, {
          kind: "library",
          path: entry.path,
          label: entry.title,
        });
      } catch (error) {
        console.error("Failed to open library diagram", error);
        window.alert("Could not open diagram from library.");
      } finally {
        setFileBusy(false);
      }
    },
    [applyDocument],
  );

  const handleImportLibrary = useCallback(
    async (entry: LibraryDiagramEntry) => {
      try {
        setFileBusy(true);
        const doc = await fetchLibraryDiagram(entry.path);
        importIntoDocument(doc);
      } catch (error) {
        console.error("Failed to import library diagram", error);
        window.alert("Could not import diagram from library.");
      } finally {
        setFileBusy(false);
      }
    },
    [importIntoDocument],
  );

  const handleNew = useCallback(() => {
    applyDocument(createEmptyDiagram(), null);
  }, [applyDocument]);

  const handleSelectAll = useCallback(() => {
    setSelectedShapeIds(document.shapes.map((shape) => shape.id));
    setSelectedConnectionId(null);
  }, [document.shapes]);

  const handleSelectPage = useCallback(
    (pageId: string) => {
      if (pageId === document.activePageId) return;
      mutate((current) => setActivePage(current, pageId));
      clearSelection();
    },
    [clearSelection, document.activePageId, mutate],
  );

  const handleAddPage = useCallback(() => {
    mutate((current) => addPage(current));
    clearSelection();
  }, [clearSelection, mutate]);

  const handleRenamePage = useCallback(
    (pageId: string, name: string) => {
      mutate((current) => renamePage(current, pageId, name));
    },
    [mutate],
  );

  const handleDuplicatePage = useCallback(
    (pageId: string) => {
      mutate((current) => duplicatePage(current, pageId));
      clearSelection();
    },
    [clearSelection, mutate],
  );

  const handleRemovePage = useCallback(
    (pageId: string) => {
      mutate((current) => removePage(current, pageId));
      clearSelection();
    },
    [clearSelection, mutate],
  );

  const libraryMenuItems: MenuItem[] = library.map((entry) => ({
    id: `library-open-${entry.path}`,
    label: entry.title,
    onSelect: () => {
      void handleOpenLibrary(entry);
    },
  }));

  const libraryImportItems: MenuItem[] = library.map((entry) => ({
    id: `library-import-${entry.path}`,
    label: entry.title,
    onSelect: () => {
      void handleImportLibrary(entry);
    },
  }));

  const menuBarItems = useMemo(
    () => [
      {
        id: "file",
        label: "File",
        items: [
          {
            id: "new",
            label: "New",
            shortcut: "⌘N",
            onSelect: handleNew,
          },
          {
            id: "open-file",
            label: "Open…",
            shortcut: "⌘O",
            disabled: fileBusy,
            onSelect: handleOpenFile,
          },
          ...libraryMenuItems,
          { id: "sep-open", label: "", separator: true },
          {
            id: "import-file",
            label: "Import…",
            disabled: fileBusy,
            onSelect: handleImportFile,
          },
          ...libraryImportItems,
          { id: "sep-export", label: "", separator: true },
          {
            id: "export-yaml",
            label: "Export as YAML",
            disabled: exportBusy,
            onSelect: () => void handleExport("yaml"),
          },
          {
            id: "export-json",
            label: "Export as JSON",
            disabled: exportBusy,
            onSelect: () => void handleExport("json"),
          },
          {
            id: "export-png",
            label: "Export as PNG",
            disabled: exportBusy,
            onSelect: () => void handleExport("png"),
          },
          {
            id: "export-jpeg",
            label: "Export as JPEG",
            disabled: exportBusy,
            onSelect: () => void handleExport("jpeg"),
          },
        ] satisfies MenuItem[],
      },
      {
        id: "edit",
        label: "Edit",
        items: [
          {
            id: "undo",
            label: "Undo",
            shortcut: "⌘Z",
            disabled: !canUndo,
            onSelect: undo,
          },
          {
            id: "redo",
            label: "Redo",
            shortcut: "⌘⇧Z",
            disabled: !canRedo,
            onSelect: redo,
          },
          { id: "sep-edit", label: "", separator: true },
          {
            id: "delete",
            label: "Delete",
            shortcut: "Del",
            disabled:
              selectedShapeIds.length === 0 && !selectedConnectionId,
            onSelect: handleDelete,
          },
          {
            id: "select-all",
            label: "Select all",
            shortcut: "⌘A",
            disabled: document.shapes.length === 0,
            onSelect: handleSelectAll,
          },
          {
            id: "deselect",
            label: "Deselect all",
            shortcut: "Esc",
            disabled:
              selectedShapeIds.length === 0 && !selectedConnectionId,
            onSelect: clearSelection,
          },
        ] satisfies MenuItem[],
      },
      {
        id: "view",
        label: "View",
        items: [
          {
            id: "zoom-in",
            label: "Zoom in",
            shortcut: "+",
            onSelect: handleZoomIn,
          },
          {
            id: "zoom-out",
            label: "Zoom out",
            shortcut: "-",
            onSelect: handleZoomOut,
          },
          {
            id: "zoom-reset",
            label: "Reset zoom",
            shortcut: "0",
            onSelect: handleZoomReset,
          },
          { id: "sep-view", label: "", separator: true },
          {
            id: "toggle-palette",
            label: "Shape library",
            checked: showPalette,
            onSelect: () => setShowPalette((value) => !value),
          },
          {
            id: "toggle-grid",
            label: "Grid",
            checked: showGrid,
            onSelect: () => setShowGrid((value) => !value),
          },
        ] satisfies MenuItem[],
      },
    ],
    [
      canRedo,
      canUndo,
      clearSelection,
      document.shapes.length,
      fileBusy,
      exportBusy,
      handleDelete,
      handleExport,
      handleImportFile,
      handleImportLibrary,
      handleNew,
      handleOpenFile,
      handleOpenLibrary,
      handleSelectAll,
      handleZoomIn,
      handleZoomOut,
      handleZoomReset,
      libraryImportItems,
      libraryMenuItems,
      redo,
      selectedConnectionId,
      selectedShapeIds.length,
      showGrid,
      showPalette,
      undo,
    ],
  );

  const pages = document.pages ?? [];
  const activePageId = document.activePageId ?? pages[0]?.id ?? "";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      if (mod && key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (mod && (key === "y" || (key === "z" && event.shiftKey))) {
        event.preventDefault();
        redo();
        return;
      }

      if (mod && key === "a") {
        event.preventDefault();
        handleSelectAll();
        return;
      }
      if (mod && key === "n") {
        event.preventDefault();
        handleNew();
        return;
      }
      if (mod && key === "o") {
        event.preventDefault();
        handleOpenFile();
        return;
      }

      if (key === "v") setTool("select");
      if (key === "m") setTool("multiselect");
      if (key === "h") setTool("pan");
      if (key === "s") setTool("shape");
      if (key === "d") setTool("draw");
      if (key === "t") setTool("text");
      if (key === "c") {
        setTool("connect");
        setPendingConnection(null);
      }
      if (key === "escape") {
        clearSelection();
      }
      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        handleDelete();
      }
      if (key === "=" || key === "+") {
        event.preventDefault();
        handleZoomIn();
      }
      if (key === "-") {
        event.preventDefault();
        handleZoomOut();
      }
      if (key === "0") {
        event.preventDefault();
        handleZoomReset();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    clearSelection,
    handleDelete,
    handleNew,
    handleOpenFile,
    handleSelectAll,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    redo,
    undo,
  ]);

  useEffect(() => {
    const area = canvasAreaRef.current;
    if (!area) return;

    const el = area;

    function onWheel(event: WheelEvent) {
      const rect = el.getBoundingClientRect();
      event.preventDefault();

      if (isPinchZoomWheel(event)) {
        const factor = getPinchZoomFactor(event);
        mutateViewport((current) =>
          updateViewport(
            current,
            zoomViewportByFactor(
              current.viewport,
              factor,
              event.clientX,
              event.clientY,
              rect,
            ),
          ),
        );
        return;
      }

      const { dx, dy } = getWheelPanDelta(event);
      if (dx === 0 && dy === 0) return;

      mutateViewport((current) =>
        updateViewport(current, {
          x: current.viewport.x - dx,
          y: current.viewport.y - dy,
        }),
      );
    }

    area.addEventListener("wheel", onWheel, { passive: false });
    return () => area.removeEventListener("wheel", onWheel);
  }, [mutateViewport]);

  const inlineEditStyle = useMemo(() => {
    if (!editingShape || !canvasShellRef.current) return null;
    const rect = canvasShellRef.current.getBoundingClientRect();
    const topLeft = diagramToClient(
      editingShape.x,
      editingShape.y,
      rect,
      document.viewport,
    );
    const width = editingShape.width * document.viewport.zoom;
    const height = editingShape.height * document.viewport.zoom;

    return {
      left: topLeft.x,
      top: topLeft.y,
      width,
      height,
      fontSize: (editingShape.style.fontSize ?? 14) * document.viewport.zoom,
    };
  }, [document.viewport, editingShape]);

  return (
    <div className={`app${showPalette ? "" : " palette-hidden"}`}>
      {showPalette ? (
        <ShapePalette
          panels={palettePanels}
          registry={defaultShapeRegistry}
          activeShapeType={activeShapeType}
          tool={tool}
          onSelectShapeType={setActiveShapeType}
          onArmShapeTool={() => setTool("shape")}
          onArmTextTool={() => setTool("text")}
        />
      ) : null}

      <main className="canvas-shell" ref={canvasShellRef}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.yaml,.yml,application/json,text/yaml"
          hidden
          onChange={handleFileInputChange}
        />

        <header className="editor-header">
          <ToolbarTitle
            title={document.metadata.title}
            onChange={(title) => {
              mutate((current) =>
                touchDocument({
                  ...current,
                  metadata: { ...current.metadata, title },
                }),
              );
            }}
          />
          <MenuBar items={menuBarItems} />
          <span className="editor-header-status">
            {document.shapes.length} shapes · {document.connections.length}{" "}
            connections
            {documentSource?.label ? ` · ${documentSource.label}` : ""}
            {multiSelectCount > 1
              ? ` · ${multiSelectCount} selected`
              : selectedShape?.label
                ? ` · ${selectedShape.label}`
                : selectedConnection?.label
                  ? ` · ${selectedConnection.label}`
                  : pendingConnection
                    ? " · pick target"
                    : ""}
          </span>
        </header>

        <Toolbar
          tool={tool}
          onToolChange={(next) => {
            setTool(next);
            if (next !== "connect") setPendingConnection(null);
          }}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          zoom={document.viewport.zoom}
          lineFormatControls={
            selectedLineShape ? (
              <LineFormatBar
                lineStyle={getLineStyle(selectedLineShape)}
                onChange={handleLineStyleChange}
              />
            ) : null
          }
        />

        <div className="canvas-area" ref={canvasAreaRef}>
          <DiagramCanvas
            ref={canvasSvgRef}
            document={document}
            showGrid={showGrid}
            tool={tool}
            activeShapeType={activeShapeType}
            selectedShapeIds={selectedShapeIds}
            selectedConnectionId={selectedConnectionId}
            pendingConnection={pendingConnection}
            onSetSelection={setSelectedShapeIds}
            onToggleShape={handleToggleShape}
            onSelectConnection={setSelectedConnectionId}
            onMoveShape={(id, x, y) => {
              mutate((current) => {
                const shape = current.shapes.find((item) => item.id === id);
                if (!shape) return current;
                if (isLineShape(shape.type)) {
                  const dx = x - shape.x;
                  const dy = y - shape.y;
                  const next = translateLinePoints({ ...shape, x, y }, dx, dy);
                  return updateShape(current, id, {
                    x: next.x,
                    y: next.y,
                    width: next.width,
                    height: next.height,
                    props: next.props,
                  });
                }
                if (isPointPathShape(shape.type)) {
                  const dx = x - shape.x;
                  const dy = y - shape.y;
                  const next = translatePathPoints({ ...shape, x, y }, dx, dy);
                  return updateShape(current, id, {
                    x: next.x,
                    y: next.y,
                    width: next.width,
                    height: next.height,
                    props: next.props,
                  });
                }
                return updateShape(current, id, { x, y });
              });
            }}
            onMoveShapes={(updates) => {
              mutate((current) =>
                updates.reduce((doc, update) => {
                  const shape = doc.shapes.find((item) => item.id === update.id);
                  if (!shape) return doc;
                  if (isLineShape(shape.type)) {
                    const dx = update.x - shape.x;
                    const dy = update.y - shape.y;
                    const next = translateLinePoints(
                      { ...shape, x: update.x, y: update.y },
                      dx,
                      dy,
                    );
                    return updateShape(doc, update.id, {
                      x: next.x,
                      y: next.y,
                      width: next.width,
                      height: next.height,
                      props: next.props,
                    });
                  }
                  if (isPointPathShape(shape.type)) {
                    const dx = update.x - shape.x;
                    const dy = update.y - shape.y;
                    const next = translatePathPoints(
                      { ...shape, x: update.x, y: update.y },
                      dx,
                      dy,
                    );
                    return updateShape(doc, update.id, {
                      x: next.x,
                      y: next.y,
                      width: next.width,
                      height: next.height,
                      props: next.props,
                    });
                  }
                  return updateShape(doc, update.id, {
                    x: update.x,
                    y: update.y,
                  });
                }, current),
              );
            }}
            onResizeShape={(id, bounds) => {
              mutate((current) => updateShape(current, id, bounds));
            }}
            onPan={(x, y) => {
              mutateViewport((current) => updateViewport(current, { x, y }));
            }}
            onCreateShape={handleCreateShape}
            onCreateFreehand={handleCreateFreehand}
            onConnectPick={handleConnectPick}
            onEditLabel={(shapeId) => {
              const shape = document.shapes.find((item) => item.id === shapeId);
              if (!shape) return;
              setEditingShapeId(shapeId);
              setLabelDraft(shape.label ?? "");
            }}
            onUpdateLinePoints={handleUpdateLinePoints}
            onAddLinePivot={handleAddLinePivot}
            selectedLinePivotIndex={selectedLinePivotIndex}
            onSelectLinePivot={setSelectedLinePivotIndex}
          />

          {editingShape && inlineEditStyle ? (
            <input
              className="inline-label-edit"
              style={inlineEditStyle}
              value={labelDraft}
              autoFocus
              onChange={(event) => setLabelDraft(event.target.value)}
              onBlur={commitLabelEdit}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitLabelEdit();
                if (event.key === "Escape") setEditingShapeId(null);
              }}
            />
          ) : null}
        </div>

        {pages.length > 0 && activePageId ? (
          <PageTabs
            pages={pages}
            activePageId={activePageId}
            onSelectPage={handleSelectPage}
            onAddPage={handleAddPage}
            onRenamePage={handleRenamePage}
            onDuplicatePage={handleDuplicatePage}
            onRemovePage={handleRemovePage}
          />
        ) : null}
      </main>
    </div>
  );
}
