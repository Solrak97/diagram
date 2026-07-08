interface IconProps {
  size?: number;
}

const defaults = { size: 18, strokeWidth: 1.75 };

function IconBase({
  size = defaults.size,
  strokeWidth = defaults.strokeWidth,
  children,
}: IconProps & { children: React.ReactNode; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SelectIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 3l14 9-6 1-2 6z" />
    </IconBase>
  );
}

export function PanIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 11V6a2 2 0 114 0v1" />
      <path d="M12 12v8" />
      <path d="M8 16H5a2 2 0 010-4h1" />
      <path d="M16 16h3a2 2 0 000-4h-1" />
      <path d="M12 4V3" />
    </IconBase>
  );
}

export function ShapeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
    </IconBase>
  );
}

export function DrawIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 16c2-4 4-6 7-6 2.5 0 3.5 2 5.5 2 1.7 0 2.7-1.1 3.5-3" />
      <path d="M16.5 7.5l1-1a1.8 1.8 0 112.5 2.5l-1 1" />
    </IconBase>
  );
}

export function TextIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 7h12" />
      <path d="M12 7v13" />
      <path d="M8 20h8" />
    </IconBase>
  );
}

export function ConnectIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="8" width="7" height="7" rx="1.5" />
      <rect x="14" y="8" width="7" height="7" rx="1.5" />
      <path d="M10 11.5h4" />
      <path d="M14 11.5l2-1.5" />
      <path d="M14 11.5l2 1.5" />
    </IconBase>
  );
}

export function MultiselectIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="7" height="7" rx="1" />
      <rect x="14" y="5" width="7" height="7" rx="1" />
      <rect x="8" y="14" width="7" height="7" rx="1" />
      <path d="M6.5 12v1.5" />
      <path d="M17.5 12v1.5" />
    </IconBase>
  );
}

export function ZoomInIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 7v6" />
      <path d="M7 10h6" />
      <path d="M16 16l4 4" />
    </IconBase>
  );
}

export function ZoomOutIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10h6" />
      <path d="M16 16l4 4" />
    </IconBase>
  );
}

export function ZoomResetIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 8V4h4" />
      <path d="M20 8V4h-4" />
      <path d="M4 16v4h4" />
      <path d="M20 16v4h-4" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </IconBase>
  );
}

export function ExportIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M5 18h14" />
    </IconBase>
  );
}

export function OpenIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6a2 2 0 012-2h5l2 2h7a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
      <path d="M12 11v5" />
      <path d="M9 14h6" />
    </IconBase>
  );
}

export function ImportIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4v10" />
      <path d="M16 10l-4 4-4-4" />
      <path d="M5 18h14" />
    </IconBase>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 7v6h6" />
      <path d="M7 13l-4-4 4-4" />
    </IconBase>
  );
}

export function RedoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M17 7v6h-6" />
      <path d="M17 13l4-4-4-4" />
    </IconBase>
  );
}

