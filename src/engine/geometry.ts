import { getPaperSizeSpec, MM_PER_INCH, PX_TO_MM } from "../data/sizes";
import type {
  HolePunchType,
  LayoutMode,
  MarginsMm,
  PaperSettings,
} from "../types/paper";

export interface RectMm {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export interface SheetLayoutGeometry {
  pageNumber: number;
  isBackPage: boolean;
  widthMm: number;
  heightMm: number;
  margins: MarginsMm;
  printableBox: RectMm;
  contentBox: RectMm;
  sidebarBox: RectMm | null;
  strokeWidthMm: number;
  dashArrayAttr: string;
}

export interface HolePunchMark {
  cx: number;
  cy: number;
  radiusMm: number;
}

export function resolvePageDimensions(settings: PaperSettings): {
  widthMm: number;
  heightMm: number;
} {
  const base =
    settings.paperSize === "custom"
      ? {
          widthMm: clampPositive(settings.customWidthMm, 210, 20, 1200),
          heightMm: clampPositive(settings.customHeightMm, 297, 20, 1200),
        }
      : getPaperSizeSpec(settings.paperSize);

  const minSide = Math.min(base.widthMm, base.heightMm);
  const maxSide = Math.max(base.widthMm, base.heightMm);

  if (settings.paperSize === "custom") {
    return settings.orientation === "landscape"
      ? { widthMm: maxSide, heightMm: minSide }
      : { widthMm: base.widthMm, heightMm: base.heightMm };
  }

  return settings.orientation === "landscape"
    ? { widthMm: maxSide, heightMm: minSide }
    : { widthMm: minSide, heightMm: maxSide };
}

export function clampPositive(
  val: number,
  fallback: number,
  min = 0.05,
  max = 5000,
): number {
  if (!Number.isFinite(val) || val < min) return fallback;
  return Math.min(max, val);
}

export function resolveMargins(
  settings: PaperSettings,
  isBackPage: boolean,
): MarginsMm {
  const top = Math.max(0, settings.marginsMm.top);
  const bottom = Math.max(0, settings.marginsMm.bottom);
  const rawLeft = Math.max(0, settings.marginsMm.left);
  const rawRight = Math.max(0, settings.marginsMm.right);

  return {
    top,
    bottom,
    left: isBackPage ? rawRight : rawLeft,
    right: isBackPage ? rawLeft : rawRight,
  };
}

export function computeSheetGeometry(
  settings: PaperSettings,
  pageNumber: number,
): SheetLayoutGeometry {
  const isBackPage = settings.doubleSided && pageNumber % 2 === 0;
  const { widthMm, heightMm } = resolvePageDimensions(settings);
  const margins = resolveMargins(settings, isBackPage);

  const safeLeft = Math.min(margins.left, Math.max(0, widthMm - 20));
  const safeRight = Math.min(margins.right, Math.max(0, widthMm - safeLeft - 10));
  const safeTop = Math.min(margins.top, Math.max(0, heightMm - 20));
  const safeBottom = Math.min(
    margins.bottom,
    Math.max(0, heightMm - safeTop - 10),
  );

  const headerReserve = settings.showDateLine
    ? Math.max(6, settings.dateFontSizeMm + 3.5)
    : 0;
  const footerReserve = settings.showPageNumber ? 7 : 0;

  const pX = safeLeft;
  const pY = safeTop + headerReserve;
  const pW = Math.max(10, widthMm - safeLeft - safeRight);
  const pH = Math.max(
    10,
    heightMm - safeTop - safeBottom - headerReserve - footerReserve,
  );

  const printableBox: RectMm = {
    x: pX,
    y: pY,
    width: pW,
    height: pH,
    right: pX + pW,
    bottom: pY + pH,
  };

  let sidebarBox: RectMm | null = null;
  let contentBox: RectMm = printableBox;

  if (settings.sidebarEnabled && pW > 30) {
    const gap = 4;
    const sw = Math.min(
      Math.max(15, settings.sidebarWidthMm),
      Math.max(15, pW * 0.4),
    );
    const effectiveSide = isBackPage
      ? settings.sidebarPosition === "left"
        ? "right"
        : "left"
      : settings.sidebarPosition;

    if (effectiveSide === "left") {
      sidebarBox = {
        x: pX,
        y: pY,
        width: sw,
        height: pH,
        right: pX + sw,
        bottom: pY + pH,
      };
      const cX = pX + sw + gap;
      const cW = Math.max(10, pW - sw - gap);
      contentBox = {
        x: cX,
        y: pY,
        width: cW,
        height: pH,
        right: cX + cW,
        bottom: pY + pH,
      };
    } else {
      const cW = Math.max(10, pW - sw - gap);
      contentBox = {
        x: pX,
        y: pY,
        width: cW,
        height: pH,
        right: pX + cW,
        bottom: pY + pH,
      };
      const sX = pX + cW + gap;
      sidebarBox = {
        x: sX,
        y: pY,
        width: sw,
        height: pH,
        right: sX + sw,
        bottom: pY + pH,
      };
    }
  }

  const strokeWidthMm = clampPositive(settings.lineWidthPx, 0.5, 0.1, 8) * PX_TO_MM;
  const dashArrayAttr =
    settings.lineStyle === "dashed"
      ? `stroke-dasharray="${(strokeWidthMm * 5).toFixed(3)} ${(strokeWidthMm * 3.5).toFixed(3)}"`
      : settings.lineStyle === "dotted"
        ? `stroke-dasharray="${strokeWidthMm.toFixed(3)} ${(strokeWidthMm * 3).toFixed(3)}" stroke-linecap="round"`
        : "";

  return {
    pageNumber,
    isBackPage,
    widthMm,
    heightMm,
    margins: {
      top: safeTop,
      right: safeRight,
      bottom: safeBottom,
      left: safeLeft,
    },
    printableBox,
    contentBox,
    sidebarBox,
    strokeWidthMm,
    dashArrayAttr,
  };
}

export function computeGridStep(
  lengthMm: number,
  targetSpacingMm: number,
  layoutMode: LayoutMode,
): { count: number; stepMm: number } {
  const safeSpacing = clampPositive(targetSpacingMm, 8, 0.5, 250);
  if (layoutMode === "fill") {
    const count = Math.max(1, Math.round(lengthMm / safeSpacing));
    return { count, stepMm: lengthMm / count };
  }
  const count = Math.max(1, Math.floor(lengthMm / safeSpacing));
  return { count, stepMm: safeSpacing };
}

export function computeHolePunchMarks(
  holePunch: HolePunchType,
  widthMm: number,
  heightMm: number,
  isBackPage: boolean,
): HolePunchMark[] {
  if (holePunch === "none") return [];
  const radiusMm = 2.8;
  const edgeInset = 12;
  const xEdge = isBackPage ? widthMm - edgeInset : edgeInset;
  const cy = heightMm / 2;
  const cx = widthMm / 2;

  switch (holePunch) {
    case "3-hole": {
      const span = 4.25 * MM_PER_INCH; // 107.95 mm
      return [cy - span, cy, cy + span]
        .filter((y) => y > 8 && y < heightMm - 8)
        .map((y) => ({ cx: xEdge, cy: y, radiusMm }));
    }
    case "2-hole": {
      const half = 40; // 80 mm apart
      return [cy - half, cy + half]
        .filter((y) => y > 8 && y < heightMm - 8)
        .map((y) => ({ cx: xEdge, cy: y, radiusMm }));
    }
    case "4-hole": {
      return [cy - 120, cy - 40, cy + 40, cy + 120]
        .filter((y) => y > 8 && y < heightMm - 8)
        .map((y) => ({ cx: xEdge, cy: y, radiusMm }));
    }
    case "5-hole": {
      const span = 4.25 * MM_PER_INCH;
      return [cy - span, cy - 40, cy, cy + 40, cy + span]
        .filter((y) => y > 8 && y < heightMm - 8)
        .map((y) => ({ cx: xEdge, cy: y, radiusMm }));
    }
    case "top-2-hole": {
      const half = (2.75 * MM_PER_INCH) / 2; // 34.925 mm
      return [cx - half, cx + half]
        .filter((x) => x > 8 && x < widthMm - 8)
        .map((x) => ({ cx: x, cy: edgeInset, radiusMm }));
    }
    case "single-ring": {
      const ringX = isBackPage ? widthMm - 14 : 14;
      return [{ cx: ringX, cy: 14, radiusMm: 3 }];
    }
  }
}

export interface ValidationErrors {
  customWidth?: string;
  customHeight?: string;
  lineSpacing?: string;
  lineWidth?: string;
  margins?: string;
  pageCount?: string;
  dateFontSize?: string;
}

export function validatePaperSettings(settings: PaperSettings): ValidationErrors {
  const errors: ValidationErrors = {};

  if (settings.paperSize === "custom") {
    if (
      !Number.isFinite(settings.customWidthMm) ||
      settings.customWidthMm < 20 ||
      settings.customWidthMm > 1200
    ) {
      errors.customWidth = "Width must be between 20 mm (0.79 in) and 1200 mm (47.2 in).";
    }
    if (
      !Number.isFinite(settings.customHeightMm) ||
      settings.customHeightMm < 20 ||
      settings.customHeightMm > 1200
    ) {
      errors.customHeight = "Height must be between 20 mm (0.79 in) and 1200 mm (47.2 in).";
    }
  }

  if (
    !Number.isFinite(settings.lineSpacingMm) ||
    settings.lineSpacingMm < 0.5 ||
    settings.lineSpacingMm > 200
  ) {
    errors.lineSpacing = "Line spacing must be between 0.5 mm (0.02 in) and 200 mm (7.87 in).";
  }

  if (
    !Number.isFinite(settings.lineWidthPx) ||
    settings.lineWidthPx < 0.1 ||
    settings.lineWidthPx > 10
  ) {
    errors.lineWidth = "Line width must be between 0.1 px and 10 px.";
  }

  const { widthMm, heightMm } = resolvePageDimensions(settings);
  const hMargins = settings.marginsMm.left + settings.marginsMm.right;
  const vMargins = settings.marginsMm.top + settings.marginsMm.bottom;
  if (
    settings.marginsMm.top < 0 ||
    settings.marginsMm.right < 0 ||
    settings.marginsMm.bottom < 0 ||
    settings.marginsMm.left < 0
  ) {
    errors.margins = "Margins cannot be negative.";
  } else if (widthMm - hMargins < 20 || heightMm - vMargins < 20) {
    errors.margins = "Margins are too large and leave less than 20 mm of printable space.";
  }

  if (
    !Number.isInteger(settings.pageCount) ||
    settings.pageCount < 1 ||
    settings.pageCount > 100
  ) {
    errors.pageCount = "Page count must be a whole number from 1 to 100.";
  }

  if (
    settings.showDateLine &&
    (!Number.isFinite(settings.dateFontSizeMm) ||
      settings.dateFontSizeMm < 2 ||
      settings.dateFontSizeMm > 5)
  ) {
    errors.dateFontSize = "Date font size must be between 2 mm and 5 mm.";
  }

  return errors;
}
