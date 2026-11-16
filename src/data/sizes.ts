import type { PaperSizeId, PaperSizeSpec, Units } from "../types/paper";

export const MM_PER_INCH = 25.4;
export const PX_TO_MM = 25.4 / 96;
export const MM_TO_TWIPS = 1440 / 25.4;

export const PAPER_SIZES: PaperSizeSpec[] = [
  {
    id: "a4",
    label: "A4 (210 × 297 mm)",
    widthMm: 210,
    heightMm: 297,
    displayDimensions: "210 × 297 mm",
  },
  {
    id: "a5",
    label: "A5 (148 × 210 mm)",
    widthMm: 148,
    heightMm: 210,
    displayDimensions: "148 × 210 mm",
  },
  {
    id: "a3",
    label: "A3 (297 × 420 mm)",
    widthMm: 297,
    heightMm: 420,
    displayDimensions: "297 × 420 mm",
  },
  {
    id: "b4",
    label: "B4 (250 × 353 mm)",
    widthMm: 250,
    heightMm: 353,
    displayDimensions: "250 × 353 mm",
  },
  {
    id: "b5",
    label: "B5 (176 × 250 mm)",
    widthMm: 176,
    heightMm: 250,
    displayDimensions: "176 × 250 mm",
  },
  {
    id: "letter",
    label: "Letter (8.5 × 11 in)",
    widthMm: 215.9,
    heightMm: 279.4,
    displayDimensions: "8.5 × 11 in",
  },
  {
    id: "legal",
    label: "Legal (8.5 × 14 in)",
    widthMm: 215.9,
    heightMm: 355.6,
    displayDimensions: "8.5 × 14 in",
  },
  {
    id: "tabloid",
    label: "Tabloid (11 × 17 in)",
    widthMm: 279.4,
    heightMm: 431.8,
    displayDimensions: "11 × 17 in",
  },
  {
    id: "executive",
    label: "Executive (7.25 × 10.5 in)",
    widthMm: 184.15,
    heightMm: 266.7,
    displayDimensions: "7.25 × 10.5 in",
  },
  {
    id: "custom",
    label: "Custom Size",
    widthMm: 210,
    heightMm: 297,
    displayDimensions: "Custom",
  },
];

export function getPaperSizeSpec(id: PaperSizeId): PaperSizeSpec {
  return PAPER_SIZES.find((size) => size.id === id) ?? PAPER_SIZES[0]!;
}

export function mmToUnit(mm: number, units: Units): number {
  return units === "in" ? mm / MM_PER_INCH : mm;
}

export function unitToMm(value: number, units: Units): number {
  return units === "in" ? value * MM_PER_INCH : value;
}

export function formatLength(mm: number, units: Units, decimals?: number): string {
  const val = mmToUnit(mm, units);
  const digits = decimals ?? (units === "in" ? 3 : 1);
  return `${Number(val.toFixed(digits))} ${units}`;
}

export function roundForUnit(mm: number, units: Units): number {
  const val = mmToUnit(mm, units);
  const precision = units === "in" ? 1000 : 100;
  return Math.round(val * precision) / precision;
}
