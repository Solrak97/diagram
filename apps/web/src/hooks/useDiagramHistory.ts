import { type DiagramDocument, parseDiagram, serializeDiagram } from "@diagram/core";
import { useCallback, useReducer } from "react";

const MAX_HISTORY = 100;

interface DiagramHistoryState {
  document: DiagramDocument;
  past: DiagramDocument[];
  future: DiagramDocument[];
}

type DiagramHistoryAction =
  | {
      type: "mutate";
      updater: (current: DiagramDocument) => DiagramDocument;
      recordHistory?: boolean;
    }
  | { type: "replace"; document: DiagramDocument }
  | { type: "undo" }
  | { type: "redo" };

function cloneDocument(document: DiagramDocument): DiagramDocument {
  return parseDiagram(serializeDiagram(document, "json"), "json");
}

function documentsEqual(a: DiagramDocument, b: DiagramDocument): boolean {
  return serializeDiagram(a, "json") === serializeDiagram(b, "json");
}

function historyReducer(
  state: DiagramHistoryState,
  action: DiagramHistoryAction,
): DiagramHistoryState {
  switch (action.type) {
    case "mutate": {
      const next = action.updater(state.document);
      if (documentsEqual(next, state.document)) {
        return state;
      }

      if (action.recordHistory === false) {
        return { ...state, document: next };
      }

      return {
        document: next,
        past: [...state.past, cloneDocument(state.document)].slice(-MAX_HISTORY),
        future: [],
      };
    }
    case "replace":
      return {
        document: action.document,
        past: [],
        future: [],
      };
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        document: previous,
        past: state.past.slice(0, -1),
        future: [cloneDocument(state.document), ...state.future].slice(
          0,
          MAX_HISTORY,
        ),
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        document: next,
        past: [...state.past, cloneDocument(state.document)].slice(-MAX_HISTORY),
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

export function useDiagramHistory(initialDocument: DiagramDocument) {
  const [state, dispatch] = useReducer(historyReducer, {
    document: initialDocument,
    past: [],
    future: [],
  });

  const mutate = useCallback(
    (
      updater: (current: DiagramDocument) => DiagramDocument,
      options?: { recordHistory?: boolean },
    ) => {
      dispatch({
        type: "mutate",
        updater,
        recordHistory: options?.recordHistory,
      });
    },
    [],
  );

  const replaceDocument = useCallback((document: DiagramDocument) => {
    dispatch({ type: "replace", document });
  }, []);

  const mutateViewport = useCallback(
    (updater: (current: DiagramDocument) => DiagramDocument) => {
      mutate(updater, { recordHistory: false });
    },
    [mutate],
  );

  const undo = useCallback(() => {
    dispatch({ type: "undo" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "redo" });
  }, []);

  return {
    document: state.document,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    mutate,
    mutateViewport,
    replaceDocument,
    undo,
    redo,
  };
}
