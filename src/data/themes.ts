import type { PrinterType, ThemeId, ThemeSpec } from "../types/paper";

export const THEMES: ThemeSpec[] = [
  {
    id: "default",
    name: "Default Theme",
    description: "Crisp white paper with clear slate-blue lines",
    backgroundColor: "#FFFFFF",
    lineColor: "#64748B",
    accentColor: "#1E3A8A",
    textColor: "#111827",
  },
  {
    id: "night",
    name: "Night Theme",
    description: "Low-glare dark charcoal sheet with muted cool lines",
    backgroundColor: "#111827",
    lineColor: "#4B5563",
    accentColor: "#93C5FD",
    textColor: "#F9FAFB",
  },
  {
    id: "sepia",
    name: "Sepia",
    description: "Warm cream tone with soft brown ink",
    backgroundColor: "#FDF6E3",
    lineColor: "#9C7A54",
    accentColor: "#78350F",
    textColor: "#292524",
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Aged parchment paper with warm charcoal lines",
    backgroundColor: "#F5ECD8",
    lineColor: "#78716C",
    accentColor: "#991B1B",
    textColor: "#1C1917",
  },
  {
    id: "pastel",
    name: "Pastel",
    description: "Soft mist background with gentle periwinkle ruling",
    backgroundColor: "#F8FAFC",
    lineColor: "#93A3D8",
    accentColor: "#6D28D9",
    textColor: "#1E293B",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional school notebook cyan lines and red margin",
    backgroundColor: "#FFFFFF",
    lineColor: "#38BDF8",
    accentColor: "#DC2626",
    textColor: "#0F172A",
  },
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Neutral alabaster sheet with subtle cool-gray lines",
    backgroundColor: "#FAFAFA",
    lineColor: "#9CA3AF",
    accentColor: "#374151",
    textColor: "#111827",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Pale coastal tint with deep marine lines",
    backgroundColor: "#F0F9FF",
    lineColor: "#0284C7",
    accentColor: "#075985",
    textColor: "#0C4A6E",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Soft sage sheet with deep evergreen lines",
    backgroundColor: "#F0FDF4",
    lineColor: "#15803D",
    accentColor: "#166534",
    textColor: "#14532D",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm peach tint with terracotta and amber accents",
    backgroundColor: "#FFF7ED",
    lineColor: "#C2410C",
    accentColor: "#9A3412",
    textColor: "#431407",
  },
  {
    id: "tech",
    name: "Tech",
    description: "Blueprint cyan-slate grid aesthetic",
    backgroundColor: "#F1F5F9",
    lineColor: "#0F766E",
    accentColor: "#1E3A8A",
    textColor: "#0F172A",
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Ivory stationery with warm charcoal and bronze lines",
    backgroundColor: "#FAF8F5",
    lineColor: "#57534E",
    accentColor: "#78350F",
    textColor: "#1C1917",
  },
  {
    id: "creative",
    name: "Creative",
    description: "Clean white sheet with vivid indigo and coral accents",
    backgroundColor: "#FFFFFF",
    lineColor: "#4F46E5",
    accentColor: "#BE123C",
    textColor: "#111827",
  },
];

export function getThemeSpec(id: ThemeId): ThemeSpec {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!;
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      Number.parseInt(clean.slice(0, 2), 16),
      Number.parseInt(clean.slice(2, 4), 16),
      Number.parseInt(clean.slice(4, 6), 16),
    ];
  }
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return [
      Number.parseInt(clean[0]! + clean[0]!, 16),
      Number.parseInt(clean[1]! + clean[1]!, 16),
      Number.parseInt(clean[2]! + clean[2]!, 16),
    ];
  }
  return [17, 24, 39];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/**
 * Convert a color for B&W laser printing when printerType === "bw".
 * Ensures backgrounds stay bright/clean white (unless dark theme inverted or user shade)
 * and strokes render as crisp dark grays for clean laser printing.
 */
export function resolvePrintColor(
  hex: string,
  role: "background" | "line" | "accent" | "text",
  printerType: PrinterType,
): string {
  if (printerType === "color") return hex;
  if (role === "background") return "#FFFFFF";
  const [r, g, b] = parseHexRgb(hex);
  const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  if (role === "text") {
    return "#111827";
  }
  if (role === "accent") {
    const capped = Math.min(lum, 55);
    return rgbToHex(capped, capped, capped);
  }
  // line: clamp between #4B4B4B (75) and #8C8C8C (140) so laser printers keep visible crisp rules
  const adjusted = Math.max(65, Math.min(135, lum));
  return rgbToHex(adjusted, adjusted, adjusted);
}
