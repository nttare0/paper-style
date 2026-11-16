import { getTemplateSpec } from "../data/templates";
import { resolvePrintColor } from "../data/themes";
import type { PaperSettings, PaperTypeId, SheetTextBlock } from "../types/paper";
import { computeGridStep, type SheetLayoutGeometry } from "./geometry";
import type { SheetField } from "./sheetFields";
import { sanitizeHexColor, svgText } from "./svgHelpers";

export interface WritingLayout {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  stepMm: number;
  fontSizeMm: number;
  baselineOffsetMm: number;
  textareaPaddingTopMm: number;
  maxRows: number;
}

export interface TextBlockMetrics {
  stepMm: number;
  fontSizeMm: number;
  baselineOffsetMm: number;
  textareaPaddingTopMm: number;
  wrappedLines: string[];
  lineCount: number;
  heightMm: number;
}

const SINGLE_FLOW_PAPER_TYPES = new Set<PaperTypeId>([
  "lined",
  "blank",
  "dot",
  "grid",
  "seyes-grid",
  "pink-millimeter-grid",
  "cross-grid",
  "vintage-note",
  "minimal-journal",
  "branded-paper",
  "sketch-paper",
  "vertical-lined",
]);

export function isSingleFlowPaperType(paperType: PaperTypeId): boolean {
  return SINGLE_FLOW_PAPER_TYPES.has(paperType);
}

export function resolveStepMm(settings: PaperSettings, sourceHeightMm: number): number {
  const rawSpacing = settings.lineSpacingMm;
  if (rawSpacing >= 4.5 && rawSpacing <= 14) {
    return computeGridStep(sourceHeightMm, rawSpacing, settings.layoutMode).stepMm;
  }
  if (settings.paperType === "monthly-calendar") {
    return 4.5;
  }
  return 6.5;
}

export function computeFontMetricsForStep(
  stepMm: number,
  fontScale = 1,
  explicitFontSizeMm?: number,
): {
  stepMm: number;
  fontSizeMm: number;
  baselineOffsetMm: number;
  textareaPaddingTopMm: number;
} {
  const scale = Number.isFinite(fontScale)
    ? Math.max(0.75, Math.min(1.4, fontScale))
    : 1;
  const computed = Math.min(stepMm * 0.72, Math.max(2.6, Math.min(5.2, stepMm * 0.54) * scale));
  const fontSizeMm = explicitFontSizeMm
    ? Math.min(stepMm * 0.85, Math.max(2.4, explicitFontSizeMm * scale))
    : computed;
  const baselineOffsetMm = stepMm - Math.max(0.7, stepMm * 0.15);
  const cssLineCenterBaseline = (stepMm + fontSizeMm * 0.72) / 2;
  const textareaPaddingTopMm = Math.max(0, baselineOffsetMm - cssLineCenterBaseline);
  return { stepMm, fontSizeMm, baselineOffsetMm, textareaPaddingTopMm };
}

export function computeWritingLayout(
  settings: PaperSettings,
  geom: SheetLayoutGeometry,
): WritingLayout {
  const tpl = getTemplateSpec(settings.paperType);
  const box = geom.contentBox;

  let xMm = box.x + 2;
  let yMm = box.y;
  let widthMm = Math.max(10, box.width - 4);
  let heightMm = Math.max(10, box.height);
  let stepSourceHeight = box.height;

  if (settings.paperType === "cornell-notes") {
    const headerH = 16;
    const summaryH = Math.min(48, box.height * 0.18);
    const cueW = Math.min(58, box.width * 0.3);
    const notesTop = box.y + headerH + 7;
    const notesHeight = Math.max(10, box.bottom - summaryH - notesTop - 0.5);
    xMm = geom.isBackPage ? box.x + 2 : box.x + cueW + 2;
    widthMm = Math.max(10, box.width - cueW - 4);
    yMm = notesTop;
    heightMm = notesHeight;
    stepSourceHeight = notesHeight;
  } else if (settings.paperType === "split-column") {
    const gap = 4;
    const halfW = (box.width - gap) / 2;
    xMm = box.x + halfW + gap + 2;
    widthMm = Math.max(10, halfW - 4);
  } else if (settings.paperType === "vintage-note") {
    xMm = box.x + 5;
    yMm = box.y + 6;
    widthMm = Math.max(10, box.width - 10);
    heightMm = Math.max(10, box.height - 12);
    stepSourceHeight = heightMm;
  } else if (settings.paperType === "branded-paper") {
    const headerY = box.y + 18;
    const footerY = box.bottom - 10;
    yMm = headerY + 3;
    heightMm = Math.max(10, footerY - headerY - 6);
    stepSourceHeight = heightMm;
  } else if (settings.paperType === "minimal-journal") {
    yMm = box.y + 11;
    heightMm = Math.max(10, box.height - 11);
    stepSourceHeight = heightMm;
  } else if (tpl.supportsLeftMarginRule && settings.showLeftMarginRule) {
    const marginOffset = Math.min(22, box.width * 0.14);
    xMm = geom.isBackPage ? box.x + 2 : box.x + marginOffset + 2;
    widthMm = Math.max(10, box.width - marginOffset - 4);
  }

  const stepMm = resolveStepMm(settings, stepSourceHeight);
  const { fontSizeMm, baselineOffsetMm, textareaPaddingTopMm } = computeFontMetricsForStep(
    stepMm,
    settings.inkFontScale,
  );
  const maxRows = Math.max(1, Math.floor(heightMm / stepMm));

  return {
    xMm,
    yMm,
    widthMm,
    heightMm,
    stepMm,
    fontSizeMm,
    baselineOffsetMm,
    textareaPaddingTopMm,
    maxRows,
  };
}

let cachedMeasureCtx: CanvasRenderingContext2D | null | undefined;
function getMeasureContext(): CanvasRenderingContext2D | null {
  if (cachedMeasureCtx !== undefined) return cachedMeasureCtx;
  if (typeof document === "undefined") {
    cachedMeasureCtx = null;
    return null;
  }
  try {
    const canvas = document.createElement("canvas");
    cachedMeasureCtx = canvas.getContext("2d");
  } catch {
    cachedMeasureCtx = null;
  }
  return cachedMeasureCtx;
}

function estimateCharWidthMm(ch: string, fontSizeMm: number): number {
  if (ch === " ") return fontSizeMm * 0.28;
  if ("ilI1.,:;'!|()[]".includes(ch)) return fontSizeMm * 0.29;
  if ("mwMW@#%&".includes(ch)) return fontSizeMm * 0.78;
  if (ch >= "A" && ch <= "Z") return fontSizeMm * 0.62;
  return fontSizeMm * 0.52;
}

function measureTextWidthMm(text: string, fontSizeMm: number): number {
  const ctx = getMeasureContext();
  if (ctx) {
    const samplePx = 100;
    ctx.font = `400 ${samplePx}px "Atkinson Hyperlegible", Helvetica, Arial, sans-serif`;
    const pxWidth = ctx.measureText(text).width;
    if (pxWidth > 0) {
      return (pxWidth / samplePx) * fontSizeMm;
    }
  }
  let sum = 0;
  for (const ch of text) {
    sum += estimateCharWidthMm(ch, fontSizeMm);
  }
  return sum;
}

export function wrapNotesToLines(
  text: string,
  maxWidthMm: number,
  fontSizeMm: number,
  maxRows: number,
): string[] {
  const paragraphs = text.replaceAll("\r\n", "\n").split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (lines.length >= maxRows) break;
    if (para.length === 0) {
      lines.push("");
      continue;
    }

    const words = para.split(/( +)/);
    let current = "";
    for (const token of words) {
      const candidate = current + token;
      if (measureTextWidthMm(candidate, fontSizeMm) <= maxWidthMm || current.length === 0) {
        if (measureTextWidthMm(candidate, fontSizeMm) <= maxWidthMm) {
          current = candidate;
        } else {
          for (const ch of token) {
            if (measureTextWidthMm(current + ch, fontSizeMm) > maxWidthMm && current.length > 0) {
              lines.push(current);
              current = ch === " " ? "" : ch;
              if (lines.length >= maxRows) break;
            } else {
              current += ch;
            }
          }
        }
      } else {
        lines.push(current.trimEnd());
        current = token.trimStart();
        if (lines.length >= maxRows) break;
      }
    }
    if (lines.length < maxRows && (current.length > 0 || para.endsWith(" "))) {
      lines.push(current.trimEnd());
    }
  }

  return lines.slice(0, maxRows);
}

export function createBlockAtPoint(
  settings: PaperSettings,
  geom: SheetLayoutGeometry,
  clickXMm: number,
  clickYMm: number,
  id: string,
): SheetTextBlock {
  const box = geom.contentBox;
  const stepMm = resolveStepMm(settings, box.height);
  const minW = 20;
  const leftBound = Math.max(4, Math.min(clickXMm, geom.widthMm - minW - 4));
  const rightBound =
    leftBound <= box.right - minW ? box.right - 1.5 : geom.widthMm - 4;
  const yMm = Math.max(4, Math.min(geom.heightMm - stepMm - 3, clickYMm - stepMm * 0.4));

  return {
    id,
    xMm: Number(leftBound.toFixed(2)),
    yMm: Number(yMm.toFixed(2)),
    widthMm: Number(Math.max(minW, rightBound - leftBound).toFixed(2)),
    text: "",
  };
}

export function computeBlockMetrics(
  block: SheetTextBlock,
  settings: PaperSettings,
  geom: SheetLayoutGeometry,
): TextBlockMetrics {
  const stepMm = resolveStepMm(settings, geom.contentBox.height);
  const scale = block.fontScale ?? settings.inkFontScale ?? 1;
  const { fontSizeMm, baselineOffsetMm, textareaPaddingTopMm } = computeFontMetricsForStep(
    stepMm,
    scale,
  );
  const maxRows = Math.max(1, Math.floor((geom.heightMm - block.yMm) / stepMm) + 2);
  const wrappedLines = wrapNotesToLines(block.text, block.widthMm, fontSizeMm, maxRows);
  const lineCount = Math.max(1, wrappedLines.length);
  const heightMm = lineCount * stepMm;

  return {
    stepMm,
    fontSizeMm,
    baselineOffsetMm,
    textareaPaddingTopMm,
    wrappedLines,
    lineCount,
    heightMm,
  };
}

export function renderSheetNotesSvg(
  text: string,
  layout: WritingLayout,
  inkColor: string,
): string {
  if (!text || text.trim().length === 0) return "";
  const safeColor = sanitizeHexColor(inkColor, "#1E293B");
  const lines = wrapNotesToLines(text, layout.widthMm, layout.fontSizeMm, layout.maxRows);

  return lines
    .map((line, idx) => {
      if (line.length === 0) return "";
      const y = layout.yMm + idx * layout.stepMm + layout.baselineOffsetMm;
      return svgText(layout.xMm, y, line, {
        fill: safeColor,
        sizeMm: layout.fontSizeMm,
        weight: "400",
      });
    })
    .join("");
}

export function renderSheetFieldsSvg(
  fields: SheetField[],
  values: Record<string, string>,
  settings: PaperSettings,
  hideFieldId?: string,
): string {
  const ink = resolvePrintColor(
    sanitizeHexColor(settings.inkColor || "#1E293B", "#1E293B"),
    "text",
    settings.printerType,
  );

  return fields
    .map((field) => {
      if (hideFieldId && field.id === hideFieldId) return "";
      const val = values[field.id];
      if (!val || val.trim().length === 0) return "";

      const metrics = computeFontMetricsForStep(
        field.stepMm,
        settings.inkFontScale,
        field.fontSizeMm,
      );

      if (field.singleLine) {
        const y = field.yMm + Math.min(field.heightMm * 0.78, metrics.baselineOffsetMm);
        return svgText(field.xMm, y, val.replaceAll(/\r?\n/g, " "), {
          fill: ink,
          sizeMm: metrics.fontSizeMm,
          weight: "400",
        });
      }

      const maxRows = Math.max(1, Math.floor((field.heightMm + 0.5) / field.stepMm));
      const lines = wrapNotesToLines(val, field.widthMm, metrics.fontSizeMm, maxRows);
      return lines
        .map((line, idx) => {
          if (line.length === 0) return "";
          const y = field.yMm + idx * field.stepMm + metrics.baselineOffsetMm;
          return svgText(field.xMm, y, line, {
            fill: ink,
            sizeMm: metrics.fontSizeMm,
            weight: "400",
          });
        })
        .join("");
    })
    .join("");
}

export function renderSheetBlocksSvg(
  blocks: SheetTextBlock[],
  settings: PaperSettings,
  geom: SheetLayoutGeometry,
  hideBlockId?: string,
): string {
  if (!blocks || blocks.length === 0) return "";

  return blocks
    .map((block) => {
      if (hideBlockId && block.id === hideBlockId) return "";
      if (!block.text || block.text.trim().length === 0) return "";

      const resolvedColor = resolvePrintColor(
        sanitizeHexColor(block.color || settings.inkColor || "#1E293B", "#1E293B"),
        "text",
        settings.printerType,
      );
      const metrics = computeBlockMetrics(block, settings, geom);

      return metrics.wrappedLines
        .map((line, idx) => {
          if (line.length === 0) return "";
          const y = block.yMm + idx * metrics.stepMm + metrics.baselineOffsetMm;
          return svgText(block.xMm, y, line, {
            fill: resolvedColor,
            sizeMm: metrics.fontSizeMm,
            weight: "400",
          });
        })
        .join("");
    })
    .join("");
}
