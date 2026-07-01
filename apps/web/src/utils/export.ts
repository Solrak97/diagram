import type { DiagramDocument } from "@diagram/core";

const EXPORT_SCALE = 2;

function sanitizeFilename(title: string) {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "diagram"
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(content: string, filename: string) {
  downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), filename);
}

export function computeDocumentBounds(
  diagram: DiagramDocument,
  padding = 48,
): { x: number; y: number; width: number; height: number } {
  if (diagram.shapes.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of diagram.shapes) {
    minX = Math.min(minX, shape.x);
    minY = Math.min(minY, shape.y);
    maxX = Math.max(maxX, shape.x + shape.width);
    maxY = Math.max(maxY, shape.y + shape.height);
  }

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

function prepareExportSvg(
  sourceSvg: SVGSVGElement,
  diagram: DiagramDocument,
): SVGSVGElement {
  const bounds = computeDocumentBounds(diagram);
  const clone = sourceSvg.cloneNode(true) as SVGSVGElement;

  clone.querySelectorAll(
    ".shape-hit, .shape-hit-line, .resize-handles, .marquee-select, .shape-preview, .connect-pending",
  ).forEach((node) => node.remove());

  clone.querySelectorAll(".shape-node.selected").forEach((node) => {
    node.classList.remove("selected");
  });

  clone.querySelectorAll(".connection-line.selected").forEach((node) => {
    node.classList.remove("selected");
    node.setAttribute("stroke", "#64748b");
    node.setAttribute("stroke-width", "2");
  });

  const contentGroup = clone.querySelector("g[transform]");
  if (contentGroup) {
    contentGroup.removeAttribute("transform");
    const bg = contentGroup.querySelector("rect[x='-10000']");
    bg?.remove();
  }

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("viewBox", `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  clone.setAttribute("width", String(bounds.width));
  clone.setAttribute("height", String(bounds.height));
  clone.removeAttribute("class");

  const background = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  background.setAttribute("x", String(bounds.x));
  background.setAttribute("y", String(bounds.y));
  background.setAttribute("width", String(bounds.width));
  background.setAttribute("height", String(bounds.height));
  background.setAttribute("fill", "#f8fafc");

  if (contentGroup?.firstChild) {
    contentGroup.insertBefore(background, contentGroup.firstChild);
  }

  return clone;
}

async function rasterizeSvg(
  svg: SVGSVGElement,
  mimeType: "image/png" | "image/jpeg",
): Promise<Blob> {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to render diagram image"));
      img.src = url;
    });

    const width = Number(svg.getAttribute("width") ?? 800);
    const height = Number(svg.getAttribute("height") ?? 600);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * EXPORT_SCALE);
    canvas.height = Math.round(height * EXPORT_SCALE);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("Export failed")),
        mimeType,
        mimeType === "image/jpeg" ? 0.92 : undefined,
      );
    });

    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportDiagramPng(
  sourceSvg: SVGSVGElement,
  diagram: DiagramDocument,
) {
  const svg = prepareExportSvg(sourceSvg, diagram);
  const blob = await rasterizeSvg(svg, "image/png");
  downloadBlob(blob, `${sanitizeFilename(diagram.metadata.title)}.png`);
}

export async function exportDiagramJpeg(
  sourceSvg: SVGSVGElement,
  diagram: DiagramDocument,
) {
  const svg = prepareExportSvg(sourceSvg, diagram);
  const blob = await rasterizeSvg(svg, "image/jpeg");
  downloadBlob(blob, `${sanitizeFilename(diagram.metadata.title)}.jpg`);
}

export function exportDiagramText(
  content: string,
  diagram: DiagramDocument,
  format: "json" | "yaml",
) {
  const ext = format === "yaml" ? "yaml" : "json";
  downloadTextFile(
    content,
    `${sanitizeFilename(diagram.metadata.title)}.${ext}`,
  );
}
