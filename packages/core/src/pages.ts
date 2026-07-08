import { nanoid } from "nanoid";
import type { DiagramDocument, DiagramPage } from "./schema.js";

function defaultPageName(index: number): string {
  return `Page-${index}`;
}

export function syncFlatToActivePage(document: DiagramDocument): DiagramDocument {
  if (!document.pages?.length || !document.activePageId) {
    return document;
  }

  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === document.activePageId
        ? {
            ...page,
            shapes: document.shapes,
            connections: document.connections,
            groups: document.groups,
            viewport: document.viewport,
          }
        : page,
    ),
  };
}

export function normalizeDocument(document: DiagramDocument): DiagramDocument {
  if (document.pages && document.pages.length > 0) {
    const activePageId =
      document.activePageId &&
      document.pages.some((page) => page.id === document.activePageId)
        ? document.activePageId
        : document.pages[0]!.id;
    const activePage =
      document.pages.find((page) => page.id === activePageId) ??
      document.pages[0]!;

    return {
      ...document,
      activePageId,
      pages: document.pages,
      shapes: activePage.shapes,
      connections: activePage.connections,
      groups: activePage.groups,
      viewport: activePage.viewport,
    };
  }

  const pageId = nanoid(10);
  const page: DiagramPage = {
    id: pageId,
    name: defaultPageName(1),
    shapes: document.shapes,
    connections: document.connections,
    groups: document.groups,
    viewport: document.viewport,
  };

  return {
    ...document,
    pages: [page],
    activePageId: pageId,
  };
}

export function prepareForSerialize(document: DiagramDocument): DiagramDocument {
  const normalized = syncFlatToActivePage(normalizeDocument(document));
  if ((normalized.pages?.length ?? 0) <= 1) {
    const page = normalized.pages![0]!;
    return {
      version: normalized.version,
      metadata: normalized.metadata,
      shapes: page.shapes,
      connections: page.connections,
      groups: page.groups,
      viewport: page.viewport,
    };
  }

  return normalized;
}

export function mutateActivePage(
  document: DiagramDocument,
  updater: (current: DiagramDocument) => DiagramDocument,
): DiagramDocument {
  const synced = syncFlatToActivePage(normalizeDocument(document));
  const updated = updater(synced);

  return syncFlatToActivePage({
    ...updated,
    pages: synced.pages!.map((page) =>
      page.id === synced.activePageId
        ? {
            ...page,
            shapes: updated.shapes,
            connections: updated.connections,
            groups: updated.groups,
            viewport: updated.viewport,
          }
        : page,
    ),
  });
}

export function setActivePage(
  document: DiagramDocument,
  pageId: string,
): DiagramDocument {
  const synced = syncFlatToActivePage(normalizeDocument(document));
  const nextPage = synced.pages!.find((page) => page.id === pageId);
  if (!nextPage) {
    throw new Error(`Page "${pageId}" not found`);
  }

  return {
    ...synced,
    activePageId: pageId,
    shapes: nextPage.shapes,
    connections: nextPage.connections,
    groups: nextPage.groups,
    viewport: nextPage.viewport,
  };
}

export function addPage(
  document: DiagramDocument,
  name?: string,
): DiagramDocument {
  const synced = syncFlatToActivePage(normalizeDocument(document));
  const pageId = nanoid(10);
  const page: DiagramPage = {
    id: pageId,
    name: name ?? defaultPageName(synced.pages!.length + 1),
    shapes: [],
    connections: [],
    groups: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };

  return {
    ...synced,
    pages: [...synced.pages!, page],
    activePageId: pageId,
    shapes: page.shapes,
    connections: page.connections,
    groups: page.groups,
    viewport: page.viewport,
  };
}

export function removePage(
  document: DiagramDocument,
  pageId: string,
): DiagramDocument {
  const synced = syncFlatToActivePage(normalizeDocument(document));
  if (synced.pages!.length <= 1) {
    return synced;
  }

  const pages = synced.pages!.filter((page) => page.id !== pageId);
  if (pages.length === synced.pages!.length) {
    return synced;
  }

  const activePageId =
    synced.activePageId === pageId ? pages[0]!.id : synced.activePageId!;
  const activePage = pages.find((page) => page.id === activePageId)!;

  return {
    ...synced,
    pages,
    activePageId,
    shapes: activePage.shapes,
    connections: activePage.connections,
    groups: activePage.groups,
    viewport: activePage.viewport,
  };
}

export function duplicatePage(
  document: DiagramDocument,
  pageId: string,
): DiagramDocument {
  const synced = syncFlatToActivePage(normalizeDocument(document));
  const source = synced.pages!.find((page) => page.id === pageId);
  if (!source) {
    return synced;
  }

  const newPageId = nanoid(10);
  const duplicate: DiagramPage = {
    ...source,
    id: newPageId,
    name: `${source.name} copy`,
    shapes: structuredClone(source.shapes),
    connections: structuredClone(source.connections),
    groups: structuredClone(source.groups),
    viewport: { ...source.viewport },
  };

  return {
    ...synced,
    pages: [...synced.pages!, duplicate],
    activePageId: newPageId,
    shapes: duplicate.shapes,
    connections: duplicate.connections,
    groups: duplicate.groups,
    viewport: duplicate.viewport,
  };
}

export function renamePage(
  document: DiagramDocument,
  pageId: string,
  name: string,
): DiagramDocument {
  const synced = syncFlatToActivePage(normalizeDocument(document));
  return {
    ...synced,
    pages: synced.pages!.map((page) =>
      page.id === pageId ? { ...page, name } : page,
    ),
  };
}

export function reorderPages(
  document: DiagramDocument,
  fromIndex: number,
  toIndex: number,
): DiagramDocument {
  const synced = syncFlatToActivePage(normalizeDocument(document));
  const pages = [...synced.pages!];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= pages.length ||
    toIndex >= pages.length
  ) {
    return synced;
  }

  const [moved] = pages.splice(fromIndex, 1);
  pages.splice(toIndex, 0, moved!);

  return {
    ...synced,
    pages,
  };
}
