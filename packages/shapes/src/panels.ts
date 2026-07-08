export interface PalettePanelItem {
  type: string;
  label?: string;
}

export interface PalettePanel {
  id: string;
  label: string;
  defaultOpen?: boolean;
  items: PalettePanelItem[];
}

export const palettePanels: PalettePanel[] = [
  {
    id: "basic-geometry",
    label: "Basic geometry",
    defaultOpen: true,
    items: [
      { type: "text" },
      { type: "freehand", label: "Draw" },
      { type: "rectangle" },
      { type: "rounded-rectangle" },
      { type: "ellipse" },
      { type: "diamond" },
      { type: "hexagon" },
      { type: "parallelogram" },
      { type: "arrow-line" },
      { type: "document" },
      { type: "container" },
    ],
  },
  {
    id: "flow-diagrams",
    label: "Flow diagrams",
    defaultOpen: true,
    items: [
      { type: "flow-start", label: "Start" },
      { type: "flow-end", label: "End" },
      { type: "rectangle", label: "Process" },
      { type: "diamond", label: "Decision" },
      { type: "parallelogram", label: "Input / Output" },
      { type: "hexagon", label: "Preparation" },
      { type: "flow-manual-input", label: "Manual input" },
      { type: "flow-delay", label: "Delay" },
      { type: "document", label: "Document" },
      { type: "off-page-connector", label: "Off-page" },
    ],
  },
  {
    id: "uml",
    label: "UML",
    defaultOpen: true,
    items: [
      { type: "actor", label: "Actor" },
      { type: "uml-use-case", label: "Use case" },
      { type: "uml-class", label: "Class" },
      { type: "uml-object", label: "Object" },
      { type: "uml-interface", label: "Interface" },
      { type: "uml-component", label: "Component" },
      { type: "uml-package", label: "Package" },
      { type: "uml-state", label: "State" },
      { type: "uml-note", label: "Note" },
      { type: "uml-seq-participant", label: "Participant" },
      { type: "uml-seq-activation", label: "Activation" },
      { type: "uml-seq-message", label: "Message" },
      { type: "container", label: "Boundary" },
    ],
  },
  {
    id: "tech-icons",
    label: "Tech icons",
    defaultOpen: false,
    items: [
      { type: "cloud" },
      { type: "cylinder", label: "Database" },
      { type: "server" },
      { type: "api-gateway" },
      { type: "queue" },
      { type: "client" },
    ],
  },
];
