import { getThemeSpec, resolvePrintColor } from "../data/themes";
import type { PaperSettings } from "../types/paper";
import {
  computeGridStep,
  computeHolePunchMarks,
  computeSheetGeometry,
  type SheetLayoutGeometry,
} from "./geometry";
import { renderBackgroundPattern } from "./patterns";
import { renderPaperTypeContent } from "./renderers";
import { getSheetFields, type SheetField } from "./sheetFields";
import { fmt, sanitizeHexColor, sanitizeImageDataUrl, svgCircle, svgLine, svgRect, svgText } from "./svgHelpers";
import {
  computeWritingLayout,
  renderSheetBlocksSvg,
  renderSheetFieldsSvg,
  renderSheetNotesSvg,
  type WritingLayout,
} from "./writingBox";

export interface BuiltSheetResult {
  svg: string;
  geometry: SheetLayoutGeometry;
  writingLayout: WritingLayout;
  fields: SheetField[];
  fittedStepMm: number;
  fittedRows: number;
  fittedCols: number;
}

export function buildSheetSvg(
  settings: PaperSettings,
  pageNumber = 1,
  options?: { hidePageNotes?: boolean; hideFieldId?: string; hideBlockId?: string },
): BuiltSheetResult {
  const geom = computeSheetGeometry(settings, pageNumber);
  const theme = getThemeSpec(settings.theme);

  const bgColor = resolvePrintColor(
    sanitizeHexColor(settings.backgroundColor, "#FFFFFF"),
    "background",
    settings.printerType,
  );
  const lineColor = resolvePrintColor(
    sanitizeHexColor(settings.lineColor, "#64748B"),
    "line",
    settings.printerType,
  );
  const accentColor = resolvePrintColor(
    sanitizeHexColor(settings.accentColor, "#1E3A8A"),
    "accent",
    settings.printerType,
  );
  const textColor = resolvePrintColor(
    sanitizeHexColor(theme.textColor, "#111827"),
    "text",
    settings.printerType,
  );

  const parts: string[] = [];

  // 1. Base paper sheet background
  parts.push(svgRect(0, 0, geom.widthMm, geom.heightMm, { fill: bgColor }));

  // 2. Background pattern
  parts.push(
    renderBackgroundPattern(
      settings.backgroundPattern,
      geom.widthMm,
      geom.heightMm,
      lineColor,
      settings.patternOpacity,
      settings.customBgImageDataUrl,
    ),
  );

  // 3. Optional sidebar panel
  if (geom.sidebarBox) {
    const sb = geom.sidebarBox;
    parts.push(
      svgRect(sb.x, sb.y, sb.width, sb.height, {
        stroke: accentColor,
        strokeWidth: geom.strokeWidthMm * 1.4,
        fill: accentColor,
        fillOpacity: 0.03,
      }),
    );
    parts.push(
      svgText(sb.x + 3, sb.y + 5.5, "NOTES / INDEX", {
        fill: accentColor,
        sizeMm: 2.8,
        weight: "700",
      }),
    );
    const sbStep = Math.max(6, settings.lineSpacingMm);
    for (let y = sb.y + 8 + sbStep; y <= sb.bottom - 2; y += sbStep) {
      parts.push(
        svgLine(sb.x + 2, y, sb.right - 2, y, {
          stroke: lineColor,
          width: geom.strokeWidthMm * 0.9,
          dash: geom.dashArrayAttr,
        }),
      );
    }
  }

  // 4. Optional top-right date line
  if (settings.showDateLine) {
    const dateSize = Math.max(2, Math.min(5, settings.dateFontSizeMm));
    const dateY = geom.margins.top + dateSize + 1;
    const labelW = dateSize * 3.1;
    const lineLen = Math.min(42, geom.printableBox.width * 0.35);
    const lineEnd = geom.printableBox.right;
    const lineStart = lineEnd - lineLen;
    parts.push(
      svgText(lineStart - labelW, dateY, "Date:", {
        fill: textColor,
        sizeMm: dateSize,
        weight: "600",
      }),
    );
    parts.push(
      svgLine(lineStart, dateY + 0.6, lineEnd, dateY + 0.6, {
        stroke: lineColor,
        width: geom.strokeWidthMm * 1.1,
      }),
    );
  }

  // 5. Main template content
  parts.push(
    renderPaperTypeContent({
      settings,
      geom,
      lineColor,
      accentColor,
      textColor,
      bgColor,
    }),
  );

  // 6. Optional Logo
  const safeLogoUrl = sanitizeImageDataUrl(settings.logoDataUrl);
  if (settings.logoEnabled && safeLogoUrl) {
    const size = Math.max(8, Math.min(45, settings.logoSizeMm));
    const pad = 6;
    const pos = settings.logoPosition;
    const lx = pos.endsWith("right") ? geom.widthMm - size - pad : pad;
    const ly = pos.startsWith("bottom") ? geom.heightMm - size - pad : pad;
    parts.push(
      `<image href="${safeLogoUrl}" x="${fmt(lx)}" y="${fmt(ly)}" width="${fmt(size)}" height="${fmt(size)}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  // 7. Optional Watermark
  if (settings.watermarkEnabled && settings.watermarkText.trim().length > 0) {
    const wmOp = Math.max(0.03, Math.min(0.6, settings.watermarkOpacity));
    const wmSize = Math.max(8, Math.min(60, settings.watermarkSizeMm));
    const cx = geom.widthMm / 2;
    const cy = geom.heightMm / 2;
    parts.push(
      svgText(cx, cy, settings.watermarkText.trim(), {
        fill: textColor,
        sizeMm: wmSize,
        anchor: "middle",
        weight: "700",
        opacity: wmOp,
        rotateDeg: settings.watermarkAngleDeg,
        rotateCx: cx,
        rotateCy: cy,
      }),
    );
  }

  // 8. Hole Punch Marks (black guide dots for hand punches)
  const holes = computeHolePunchMarks(
    settings.holePunch,
    geom.widthMm,
    geom.heightMm,
    geom.isBackPage,
  );
  for (const hole of holes) {
    parts.push(
      svgCircle(hole.cx, hole.cy, hole.radiusMm, {
        fill: "#111827",
      }),
    );
  }

  // 9. Optional User Notes, Template Fields, & Click-Anywhere Blocks typed directly on the sheet
  const writingLayout = computeWritingLayout(settings, geom);
  const fields = getSheetFields(settings, geom);
  const pageKey = String(pageNumber);
  const pageNote = settings.pageNotes?.[pageKey] ?? "";
  const pageFieldValues = settings.pageFields?.[pageKey] ?? {};
  const pageBlocks = settings.pageTextBlocks?.[pageKey] ?? [];
  if (!options?.hidePageNotes && pageNote.trim().length > 0) {
    const resolvedInk = resolvePrintColor(
      sanitizeHexColor(settings.inkColor || "#1E293B", "#1E293B"),
      "text",
      settings.printerType,
    );
    parts.push(renderSheetNotesSvg(pageNote, writingLayout, resolvedInk));
  }
  if (!options?.hidePageNotes && fields.length > 0) {
    parts.push(
      renderSheetFieldsSvg(fields, pageFieldValues, settings, options?.hideFieldId),
    );
  }
  if (!options?.hidePageNotes && pageBlocks.length > 0) {
    parts.push(renderSheetBlocksSvg(pageBlocks, settings, geom, options?.hideBlockId));
  }

  // 10. Optional Page Number
  if (settings.showPageNumber) {
    const pageY = geom.heightMm - Math.max(3, geom.margins.bottom * 0.45);
    const label = `Page ${pageNumber} of ${settings.pageCount}`;
    const anchor = settings.doubleSided
      ? geom.isBackPage
        ? "start"
        : "end"
      : "middle";
    const px =
      anchor === "middle"
        ? geom.widthMm / 2
        : anchor === "start"
          ? geom.margins.left
          : geom.widthMm - geom.margins.right;
    parts.push(
      svgText(px, pageY, label, {
        fill: textColor,
        sizeMm: 2.8,
        anchor,
        weight: "600",
      }),
    );
  }

  const rowMetrics = computeGridStep(
    geom.contentBox.height,
    settings.lineSpacingMm,
    settings.layoutMode,
  );
  const colMetrics = computeGridStep(
    geom.contentBox.width,
    settings.lineSpacingMm,
    settings.layoutMode,
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(geom.widthMm)}mm" height="${fmt(geom.heightMm)}mm" viewBox="0 0 ${fmt(geom.widthMm)} ${fmt(geom.heightMm)}" role="img" aria-label="Generated paper sheet preview">${parts.join("")}</svg>`;

  return {
    svg,
    geometry: geom,
    writingLayout,
    fields,
    fittedStepMm: rowMetrics.stepMm,
    fittedRows: rowMetrics.count,
    fittedCols: colMetrics.count,
  };
}
