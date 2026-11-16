export type Units = "mm" | "in";

export type PrinterType = "color" | "bw";

export type PaperSizeId =
  | "a4"
  | "a5"
  | "a3"
  | "b4"
  | "b5"
  | "letter"
  | "legal"
  | "tabloid"
  | "executive"
  | "custom";

export type Orientation = "portrait" | "landscape";

export type ThemeId =
  | "default"
  | "night"
  | "sepia"
  | "vintage"
  | "pastel"
  | "classic"
  | "minimalist"
  | "ocean"
  | "forest"
  | "sunset"
  | "tech"
  | "elegant"
  | "creative";

export type LineStyle = "solid" | "dashed" | "dotted";

export type LayoutMode = "fill" | "fixed";

export type HolePunchType =
  | "none"
  | "3-hole"
  | "2-hole"
  | "4-hole"
  | "5-hole"
  | "top-2-hole"
  | "single-ring";

export type BackgroundPatternId =
  | "none"
  | "grid"
  | "dots"
  | "lines"
  | "crosshatch"
  | "graph"
  | "vertical-stripes"
  | "diagonal-slash"
  | "diagonal-backslash"
  | "dense-dots"
  | "checkerboard"
  | "solid-shade"
  | "custom-image";

export type CornerPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type PaperCategory =
  | "essential"
  | "math-tech"
  | "music"
  | "calligraphy"
  | "homework"
  | "planners";

export type PaperTypeId =
  | "lined"
  | "vertical-lined"
  | "grid"
  | "dot"
  | "pink-millimeter-grid"
  | "split-column"
  | "blank"
  | "music"
  | "guitar-tab"
  | "bass-tab"
  | "staff-ukulele-tab"
  | "treble-chord-diagrams"
  | "calligraphy"
  | "modern-calligraphy-slant"
  | "slant-ruled"
  | "cornell-notes"
  | "isometric-grid"
  | "isometric-dot"
  | "perspective-grid"
  | "hexagonal-grid"
  | "seyes-grid"
  | "storyboard"
  | "pinyin-practice"
  | "pinyin-tianzi"
  | "composition"
  | "genko-yoshi"
  | "arithmetic"
  | "english-practice"
  | "english-handwriting"
  | "us-handwriting"
  | "us-handwriting-half"
  | "german-three-line"
  | "german-three-line-border"
  | "lineatur-3"
  | "brazilian-calligraphy"
  | "practice-paper"
  | "braille-practice"
  | "mi-zi-ge"
  | "hui-gong-ge"
  | "jiu-gong-ge"
  | "chinese-tianzi"
  | "cross-grid"
  | "knitting-graph"
  | "hardpen-hui-gong-ge"
  | "vintage-note"
  | "children-drawing"
  | "minimal-journal"
  | "student-note"
  | "meeting-note"
  | "project-planning"
  | "task-planning"
  | "weekly-checklist"
  | "weekly-planner"
  | "daily-planner"
  | "weekly-meal-planner"
  | "polar-grid"
  | "number-line"
  | "semi-log-graph"
  | "log-log-graph"
  | "ten-frames"
  | "monthly-habit-tracker"
  | "workout-log"
  | "monthly-calendar"
  | "blank-clock-faces"
  | "recipe-cards"
  | "fraction-bars"
  | "sewing-pattern-grid"
  | "swot-analysis"
  | "medication-tracker"
  | "goal-thermometer"
  | "household-budget"
  | "sketch-paper"
  | "creative-log"
  | "branded-paper"
  | "error-correction"
  | "chinese-preview-card"
  | "chinese-english-word";

export interface MarginsMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SheetTextBlock {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  text: string;
  color?: string;
  fontScale?: number;
}

export interface PaperSettings {
  version: 1;
  printerType: PrinterType;
  paperType: PaperTypeId;
  units: Units;
  paperSize: PaperSizeId;
  orientation: Orientation;
  customWidthMm: number;
  customHeightMm: number;
  theme: ThemeId;
  lineColor: string;
  accentColor: string;
  lineStyle: LineStyle;
  lineSpacingMm: number;
  lineWidthPx: number;
  layoutMode: LayoutMode;
  linkMargins: boolean;
  marginsMm: MarginsMm;
  showDateLine: boolean;
  dateFontSizeMm: number;
  showLeftMarginRule: boolean;
  slantAngleDeg: number;
  holePunch: HolePunchType;
  sidebarEnabled: boolean;
  sidebarWidthMm: number;
  sidebarPosition: "left" | "right";
  backgroundColor: string;
  backgroundPattern: BackgroundPatternId;
  patternOpacity: number;
  customBgImageDataUrl: string;
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkSizeMm: number;
  watermarkAngleDeg: number;
  logoEnabled: boolean;
  logoDataUrl: string;
  logoPosition: CornerPosition;
  logoSizeMm: number;
  pageCount: number;
  showPageNumber: boolean;
  doubleSided: boolean;
  pageNotes: Record<string, string>;
  pageTextBlocks: Record<string, SheetTextBlock[]>;
  pageFields: Record<string, Record<string, string>>;
  inkColor: string;
  inkFontScale: number;
}

export interface PaperSizeSpec {
  id: PaperSizeId;
  label: string;
  widthMm: number;
  heightMm: number;
  displayDimensions: string;
}

export interface ThemeSpec {
  id: ThemeId;
  name: string;
  description: string;
  backgroundColor: string;
  lineColor: string;
  accentColor: string;
  textColor: string;
}

export interface PaperTemplateSpec {
  id: PaperTypeId;
  name: string;
  category: PaperCategory;
  description: string;
  defaultSpacingMm: number;
  defaultLineWidthPx: number;
  defaultOrientation?: Orientation;
  defaultLineColor?: string;
  defaultAccentColor?: string;
  defaultShowLeftMarginRule?: boolean;
  defaultSlantAngleDeg?: number;
  supportsSlantAngle?: boolean;
  supportsLeftMarginRule?: boolean;
}
