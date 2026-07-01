import type { Shape } from "@diagram/core";
import {
  buildLinePath,
  getLinePathPoints,
  getLineStrokeDasharray,
  isHorizontalLine,
  isLineShape,
} from "../utils/lines";

interface ShapeGraphicsProps {
  shape: Shape;
  preview?: boolean;
  showLabel?: boolean;
  showTextBounds?: boolean;
}

function renderArrowLine(shape: Shape, style: ReturnType<typeof bodyStyle>) {
  const isReturn = shape.props.return === true;
  const pathPoints = isReturn
    ? [...getLinePathPoints(shape)].reverse()
    : getLinePathPoints(shape);
  const label = shape.label ?? "";
  const bounds = pathPoints.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    },
  );
  const midX = (bounds.minX + bounds.maxX) / 2;
  const midY = (bounds.minY + bounds.maxY) / 2;
  const labelOffset = isHorizontalLine(shape) ? -8 : -6;

  return (
    <>
      <path
        className="shape-line"
        d={buildLinePath(pathPoints)}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth ?? 1.75}
        strokeDasharray={getLineStrokeDasharray(shape)}
        opacity={style.opacity}
        markerEnd={isReturn ? undefined : "url(#seq-arrow-solid)"}
        markerStart={isReturn ? "url(#seq-arrow-open)" : undefined}
      />
      {label ? (
        <text
          className="shape-label"
          x={midX}
          y={midY + labelOffset}
          fill={shape.style.textColor ?? "#0f172a"}
          fontSize={shape.style.fontSize ?? 13}
          fontFamily={shape.style.fontFamily ?? "system-ui, sans-serif"}
          textAnchor="middle"
        >
          {label}
        </text>
      ) : null}
    </>
  );
}

function labelProps(shape: Shape) {
  return {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2,
    fill: shape.style.textColor ?? "#0f172a",
    fontSize: shape.style.fontSize ?? 14,
    fontFamily: shape.style.fontFamily ?? "system-ui, sans-serif",
    textAnchor: "middle" as const,
    dominantBaseline: "middle" as const,
  };
}

function bodyStyle(shape: Shape, preview: boolean) {
  return {
    fill: shape.style.fill ?? "#ffffff",
    stroke: shape.style.stroke ?? "#1e293b",
    strokeWidth: shape.style.strokeWidth ?? 2,
    opacity: preview ? 0.72 : (shape.style.opacity ?? 1),
  };
}

export function ShapeGraphics({
  shape,
  preview = false,
  showLabel = true,
  showTextBounds = false,
}: ShapeGraphicsProps) {
  const style = bodyStyle(shape, preview);
  const dashed =
    shape.type === "container" || shape.props.dashed === true
      ? "8 6"
      : undefined;
  const cornerRadius = Number(shape.props.cornerRadius ?? 0);
  const skew = Number(shape.props.skew ?? 24);
  const className = preview ? "shape-body shape-preview" : "shape-body";

  let body: React.ReactNode;

  switch (shape.type) {
    case "ellipse":
    case "uml-use-case":
      body = (
        <ellipse
          className={className}
          cx={shape.x + shape.width / 2}
          cy={shape.y + shape.height / 2}
          rx={shape.width / 2}
          ry={shape.height / 2}
          {...style}
        />
      );
      break;
    case "rounded-rectangle":
      body = (
        <rect
          className={className}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={cornerRadius || 12}
          {...style}
        />
      );
      break;
    case "diamond":
      body = (
        <polygon
          className={className}
          points={`${shape.x + shape.width / 2},${shape.y} ${shape.x + shape.width},${shape.y + shape.height / 2} ${shape.x + shape.width / 2},${shape.y + shape.height} ${shape.x},${shape.y + shape.height / 2}`}
          {...style}
        />
      );
      break;
    case "parallelogram":
      body = (
        <polygon
          className={className}
          points={`${shape.x + skew},${shape.y} ${shape.x + shape.width},${shape.y} ${shape.x + shape.width - skew},${shape.y + shape.height} ${shape.x},${shape.y + shape.height}`}
          {...style}
        />
      );
      break;
    case "cylinder": {
      const ry = Math.min(16, shape.height * 0.12);
      body = (
        <>
          <rect
            className={className}
            x={shape.x}
            y={shape.y + ry}
            width={shape.width}
            height={shape.height - ry * 2}
            {...style}
          />
          <ellipse
            className={className}
            cx={shape.x + shape.width / 2}
            cy={shape.y + ry}
            rx={shape.width / 2}
            ry={ry}
            {...style}
          />
          <ellipse
            className={className}
            cx={shape.x + shape.width / 2}
            cy={shape.y + shape.height - ry}
            rx={shape.width / 2}
            ry={ry}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        </>
      );
      break;
    }
    case "cloud":
      body = (
        <path
          className={className}
          d={`M ${shape.x + shape.width * 0.25} ${shape.y + shape.height * 0.65}
             C ${shape.x} ${shape.y + shape.height * 0.45}, ${shape.x + shape.width * 0.1} ${shape.y + shape.height * 0.15}, ${shape.x + shape.width * 0.35} ${shape.y + shape.height * 0.2}
             C ${shape.x + shape.width * 0.45} ${shape.y}, ${shape.x + shape.width * 0.75} ${shape.y}, ${shape.x + shape.width * 0.8} ${shape.y + shape.height * 0.25}
             C ${shape.x + shape.width} ${shape.y + shape.height * 0.25}, ${shape.x + shape.width} ${shape.y + shape.height * 0.55}, ${shape.x + shape.width * 0.85} ${shape.y + shape.height * 0.65}
             C ${shape.x + shape.width * 0.9} ${shape.y + shape.height * 0.9}, ${shape.x + shape.width * 0.55} ${shape.y + shape.height}, ${shape.x + shape.width * 0.35} ${shape.y + shape.height * 0.85}
             C ${shape.x + shape.width * 0.15} ${shape.y + shape.height * 0.95}, ${shape.x} ${shape.y + shape.height * 0.8}, ${shape.x + shape.width * 0.25} ${shape.y + shape.height * 0.65} Z`}
          {...style}
        />
      );
      break;
    case "hexagon":
      body = (
        <polygon
          className={className}
          points={`${shape.x + shape.width * 0.25},${shape.y} ${shape.x + shape.width * 0.75},${shape.y} ${shape.x + shape.width},${shape.y + shape.height / 2} ${shape.x + shape.width * 0.75},${shape.y + shape.height} ${shape.x + shape.width * 0.25},${shape.y + shape.height} ${shape.x},${shape.y + shape.height / 2}`}
          {...style}
        />
      );
      break;
    case "document": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const fold = Math.min(w * 0.22, h * 0.22, 28);
      body = (
        <>
          <path
            className={className}
            d={`M ${x} ${y} H ${x + w - fold} L ${x + w} ${y + fold} V ${y + h} H ${x} Z`}
            {...style}
          />
          <path
            d={`M ${x + w - fold} ${y} L ${x + w} ${y + fold} L ${x + w - fold} ${y + fold} Z`}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={(style.opacity ?? 1) * 0.9}
          />
        </>
      );
      break;
    }
    case "actor": {
      const cx = shape.x + shape.width / 2;
      const headR = Math.min(shape.width * 0.24, shape.height * 0.13, 14);
      const headCy = shape.y + headR + 2;
      const bodyTop = headCy + headR + 2;
      const shoulderY = shape.y + shape.height * 0.48;
      const footY = shape.y + shape.height - 4;
      const armSpan = shape.width * 0.38;
      const legSpread = shape.width * 0.32;
      body = (
        <>
          <circle
            className={className}
            cx={cx}
            cy={headCy}
            r={headR}
            {...style}
          />
          <line
            x1={cx}
            y1={bodyTop}
            x2={cx}
            y2={footY - shape.height * 0.12}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
          <line
            x1={cx - armSpan}
            y1={shoulderY}
            x2={cx + armSpan}
            y2={shoulderY}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
          <line
            x1={cx}
            y1={footY - shape.height * 0.12}
            x2={cx - legSpread}
            y2={footY}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
          <line
            x1={cx}
            y1={footY - shape.height * 0.12}
            x2={cx + legSpread}
            y2={footY}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        </>
      );
      break;
    }
    case "text":
      body = (
        <rect
          className={`${className} text-bounds`}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill="transparent"
          stroke={preview || showTextBounds ? style.stroke : "transparent"}
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={1}
        />
      );
      break;
    case "server": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const inset = w * 0.12;
      body = (
        <>
          <rect className={className} x={x} y={y} width={w} height={h} rx={4} {...style} />
          {[0.28, 0.44, 0.6].map((ratio) => (
            <line
              key={ratio}
              x1={x + inset}
              y1={y + h * ratio}
              x2={x + w - inset}
              y2={y + h * ratio}
              stroke={style.stroke}
              strokeWidth={1.5}
              opacity={style.opacity}
            />
          ))}
          <circle
            cx={x + w * 0.78}
            cy={y + h * 0.14}
            r={Math.min(w, h) * 0.04}
            fill={style.stroke}
            opacity={style.opacity}
          />
        </>
      );
      break;
    }
    case "api-gateway": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const cy = y + h / 2;
      body = (
        <>
          <polygon
            className={className}
            points={`${x + w * 0.18},${cy} ${x + w * 0.38},${y} ${x + w * 0.62},${y} ${x + w * 0.82},${cy} ${x + w * 0.62},${y + h} ${x + w * 0.38},${y + h}`}
            {...style}
          />
          <path
            d={`M ${x + w * 0.08} ${cy} H ${x + w * 0.18} M ${x + w * 0.82} ${cy} H ${x + w * 0.92}`}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        </>
      );
      break;
    }
    case "queue": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const slotH = h / 3.4;
      const gap = h * 0.06;
      body = (
        <>
          {[0, 1, 2].map((index) => (
            <rect
              key={index}
              className={className}
              x={x}
              y={y + index * (slotH + gap)}
              width={w}
              height={slotH}
              rx={4}
              {...style}
            />
          ))}
        </>
      );
      break;
    }
    case "client": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const screenH = h * 0.72;
      const standW = w * 0.35;
      body = (
        <>
          <rect
            className={className}
            x={x}
            y={y}
            width={w}
            height={screenH}
            rx={4}
            {...style}
          />
          <rect
            x={x + w * 0.08}
            y={y + screenH * 0.12}
            width={w * 0.84}
            height={screenH * 0.62}
            rx={2}
            fill="#e2e8f0"
            stroke="none"
          />
          <rect
            x={x + (w - standW) / 2}
            y={y + screenH}
            width={standW}
            height={h - screenH}
            fill={style.stroke}
            opacity={0.35}
            stroke="none"
          />
        </>
      );
      break;
    }
    case "terminator":
    case "flow-start":
    case "flow-end": {
      const rx = shape.height / 2;
      body = (
        <rect
          className={className}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={rx}
          {...style}
        />
      );
      break;
    }
    case "flow-delay": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const curve = Math.min(h * 0.5, w * 0.35);
      body = (
        <path
          className={className}
          d={`M ${x} ${y} H ${x + w - curve} A ${curve} ${h / 2} 0 0 1 ${x + w} ${y + h / 2} A ${curve} ${h / 2} 0 0 1 ${x + w - curve} ${y + h} H ${x} Z`}
          {...style}
        />
      );
      break;
    }
    case "flow-manual-input": {
      const skew = Number(shape.props.skew ?? 20);
      body = (
        <polygon
          className={className}
          points={`${shape.x + skew},${shape.y} ${shape.x + shape.width - skew},${shape.y} ${shape.x + shape.width},${shape.y + shape.height} ${shape.x},${shape.y + shape.height}`}
          {...style}
        />
      );
      break;
    }
    case "off-page-connector": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      body = (
        <polygon
          className={className}
          points={`${x},${y} ${x + w * 0.72},${y} ${x + w},${y + h / 2} ${x + w * 0.72},${y + h} ${x},${y + h}`}
          {...style}
        />
      );
      break;
    }
    case "uml-class": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const line1 = y + h * 0.28;
      const line2 = y + h * 0.58;
      body = (
        <>
          <rect className={className} x={x} y={y} width={w} height={h} {...style} />
          <line x1={x} y1={line1} x2={x + w} y2={line1} stroke={style.stroke} strokeWidth={1.5} />
          <line x1={x} y1={line2} x2={x + w} y2={line2} stroke={style.stroke} strokeWidth={1.5} />
        </>
      );
      break;
    }
    case "uml-component": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const tabW = Math.min(18, w * 0.14);
      const tabH = Math.min(22, h * 0.22);
      body = (
        <>
          <rect className={className} x={x} y={y} width={w} height={h} {...style} />
          <rect x={x} y={y + tabH * 0.35} width={tabW} height={tabH} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} />
          <rect x={x} y={y + h - tabH * 1.35} width={tabW} height={tabH} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} />
        </>
      );
      break;
    }
    case "uml-interface": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const cy = y + h / 2;
      const r = Math.min(h * 0.38, 14);
      body = (
        <>
          <circle className={className} cx={x + r + 4} cy={cy} r={r} {...style} />
          <line x1={x + r * 2 + 8} y1={cy} x2={x + w} y2={cy} stroke={style.stroke} strokeWidth={style.strokeWidth} />
        </>
      );
      break;
    }
    case "uml-package": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const tabW = w * 0.42;
      const tabH = h * 0.14;
      body = (
        <>
          <path
            className={className}
            d={`M ${x} ${y + tabH} H ${x + w} V ${y + h} H ${x} Z`}
            {...style}
          />
          <path
            d={`M ${x} ${y + tabH} V ${y} H ${x + tabW} V ${y + tabH}`}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
          />
        </>
      );
      break;
    }
    case "uml-state": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const r = Math.min(16, h * 0.28);
      body = (
        <path
          className={className}
          d={`M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h} H ${x} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`}
          {...style}
        />
      );
      break;
    }
    case "uml-object": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const header = h * 0.32;
      body = (
        <>
          <rect className={className} x={x} y={y} width={w} height={h} {...style} />
          <line x1={x} y1={y + header} x2={x + w} y2={y + header} stroke={style.stroke} strokeWidth={1.5} />
        </>
      );
      break;
    }
    case "uml-note": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const fold = Math.min(w * 0.22, h * 0.22, 22);
      body = (
        <>
          <path
            className={className}
            d={`M ${x} ${y} H ${x + w - fold} L ${x + w} ${y + fold} V ${y + h} H ${x} Z`}
            {...style}
          />
          <path
            d={`M ${x + w - fold} ${y} L ${x + w} ${y + fold} L ${x + w - fold} ${y + fold} Z`}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={0.85}
          />
        </>
      );
      break;
    }
    case "uml-seq-participant": {
      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;
      const headerH = Number(shape.props.headerHeight ?? 48);
      const hasActor = shape.props.actor === true;
      const actorBand = hasActor ? Math.min(56, h * 0.16) : 0;
      const headerY = y + actorBand;
      const cx = x + w / 2;
      const lifelineTop = headerY + headerH;

      body = (
        <>
          {hasActor ? (
            <>
              <circle
                cx={cx}
                cy={y + actorBand * 0.38}
                r={Math.min(w * 0.12, 10)}
                fill="none"
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                opacity={style.opacity}
              />
              <line
                x1={cx}
                y1={y + actorBand * 0.38 + 10}
                x2={cx}
                y2={y + actorBand * 0.82}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                opacity={style.opacity}
              />
              <line
                x1={cx - w * 0.18}
                y1={y + actorBand * 0.55}
                x2={cx + w * 0.18}
                y2={y + actorBand * 0.55}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                opacity={style.opacity}
              />
              <line
                x1={cx}
                y1={y + actorBand * 0.82}
                x2={cx - w * 0.14}
                y2={y + actorBand * 0.98}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                opacity={style.opacity}
              />
              <line
                x1={cx}
                y1={y + actorBand * 0.82}
                x2={cx + w * 0.14}
                y2={y + actorBand * 0.98}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                opacity={style.opacity}
              />
            </>
          ) : null}
          <rect
            className={className}
            x={x}
            y={headerY}
            width={w}
            height={headerH}
            {...style}
          />
          <line
            x1={cx}
            y1={lifelineTop}
            x2={cx}
            y2={y + h}
            stroke={style.stroke}
            strokeWidth={1.5}
            strokeDasharray="6 5"
            opacity={style.opacity}
          />
          {shape.label ? (
            <text
              className="shape-label"
              x={cx}
              y={headerY + headerH / 2}
              fill={shape.style.textColor ?? "#0f172a"}
              fontSize={shape.style.fontSize ?? 14}
              fontFamily={shape.style.fontFamily ?? "system-ui, sans-serif"}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {shape.label}
            </text>
          ) : null}
        </>
      );
      break;
    }
    case "uml-seq-activation": {
      body = (
        <rect
          className={className}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          {...style}
        />
      );
      break;
    }
    case "uml-seq-message":
    case "arrow-line":
      body = renderArrowLine(shape, style);
      break;
    default:
      body = (
        <rect
          className={className}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={cornerRadius}
          strokeDasharray={dashed}
          {...style}
        />
      );
  }

  const hideDefaultLabel =
    shape.type === "uml-seq-participant" ||
    isLineShape(shape.type) ||
    shape.type === "uml-seq-activation";

  return (
    <g pointerEvents="none">
      {body}
      {showLabel && shape.label && !hideDefaultLabel ? (
        <text className="shape-label" {...labelProps(shape)}>
          {shape.label}
        </text>
      ) : null}
    </g>
  );
}
