import { getTemplateSpec } from "../data/templates";
import { resolvePrintColor } from "../data/themes";
import type { PaperSettings, PaperTypeId, SheetTextBlock } from "../types/paper";
import { computeGridStep, type SheetLayoutGeometry } from "./geometry";
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
    return 5.2;
  }
  return 6.5;
}

export function computeFontMetricsForStep(
  stepMm: number,
  fontScale = 1,
): {
  stepMm: number;
  fontSizeMm: number;
  baselineOffsetMm: number;
  textareaPaddingTopMm: number;
} {
  const scale = Number.isFinite(fontScale)
    ? Math.max(0.75, Math.min(1.4, fontScale))
    : 1;
  const fontSizeMm = Math.min(stepMm * 0.72, Math.max(2.6, stepMm * 0.54 * scale));
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

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function snapYToBaseline(clickYMm: number, anchorTopMm: number, stepMm: number): number {
  const rowIdx = Math.max(0, Math.floor((clickYMm - anchorTopMm) / stepMm));
  return Number((anchorTopMm + rowIdx * stepMm).toFixed(2));
}

export function createBlockAtPoint(
  settings: PaperSettings,
  geom: SheetLayoutGeometry,
  clickXMm: number,
  clickYMm: number,
  id: string,
): SheetTextBlock {
  const tpl = getTemplateSpec(settings.paperType);
  const box = geom.contentBox;
  const stepMm = resolveStepMm(settings, box.height);
  const minW = 18;

  let leftBound = Math.max(4, Math.min(clickXMm, geom.widthMm - minW - 4));
  let rightBound =
    clickXMm <= box.right - minW ? box.right - 1.5 : geom.widthMm - 4;
  let yMm = clamp(clickYMm - stepMm * 0.45, 4, geom.heightMm - stepMm - 3);

  const idType = settings.paperType;

  if (idType === "lined" || idType === "vintage-note" || idType === "branded-paper") {
    const layout = computeWritingLayout(settings, geom);
    if (
      clickXMm >= layout.xMm - 4 &&
      clickXMm <= box.right &&
      clickYMm >= layout.yMm &&
      clickYMm <= layout.yMm + layout.heightMm
    ) {
      leftBound = Math.max(layout.xMm, Math.min(clickXMm, box.right - minW));
      rightBound = box.right - 1.5;
      yMm = snapYToBaseline(clickYMm, layout.yMm, layout.stepMm);
    }
  } else if (idType === "cornell-notes") {
    const headerH = 16;
    const summaryH = Math.min(48, box.height * 0.18);
    const cueW = Math.min(58, box.width * 0.3);
    const notesTop = box.y + headerH;
    const notesBottom = box.bottom - summaryH;
    const cueX = geom.isBackPage ? box.right - cueW : box.x + cueW;

    if (clickYMm < notesTop) {
      leftBound = clamp(clickXMm, box.x + 2, box.right - minW);
      rightBound = box.right - 2;
    } else if (clickYMm < notesBottom) {
      const inCue = geom.isBackPage ? clickXMm >= cueX : clickXMm < cueX;
      const colLeft = inCue ? (geom.isBackPage ? cueX + 2 : box.x + 2) : (geom.isBackPage ? box.x + 2 : cueX + 2);
      const colRight = inCue ? (geom.isBackPage ? box.right - 2 : cueX - 2) : (geom.isBackPage ? cueX - 2 : box.right - 2);
      leftBound = clamp(clickXMm, colLeft, Math.max(colLeft, colRight - minW));
      rightBound = colRight;
      const nStep = resolveStepMm(settings, Math.max(10, notesBottom - (notesTop + 7)));
      yMm = snapYToBaseline(clickYMm, notesTop + 7, nStep);
    } else {
      leftBound = clamp(clickXMm, box.x + 2, box.right - minW);
      rightBound = box.right - 2;
      const sStep = resolveStepMm(settings, Math.max(10, summaryH - 7));
      yMm = snapYToBaseline(clickYMm, notesBottom + 7, sStep);
    }
  } else if (idType === "weekly-planner") {
    const cols = 2;
    const rows = 4;
    const gap = 5;
    const cellW = (box.width - gap) / cols;
    const cellH = (box.height - gap * (rows - 1)) / rows;
    const col = clamp(Math.floor((clickXMm - box.x) / (cellW + gap)), 0, 1);
    const row = clamp(Math.floor((clickYMm - box.y) / (cellH + gap)), 0, 3);
    const cellLeft = box.x + col * (cellW + gap) + 2;
    const cellRight = cellLeft + cellW - 4;
    const cellTop = box.y + row * (cellH + gap) + 8;
    leftBound = clamp(clickXMm, cellLeft, Math.max(cellLeft, cellRight - minW));
    rightBound = cellRight;
    yMm = Math.max(cellTop, yMm);
  } else if (idType === "swot-analysis") {
    const gap = 5;
    const qW = (box.width - gap) / 2;
    const qH = (box.height - gap) / 2;
    const col = clamp(Math.floor((clickXMm - box.x) / (qW + gap)), 0, 1);
    const row = clamp(Math.floor((clickYMm - box.y) / (qH + gap)), 0, 1);
    const cellLeft = box.x + col * (qW + gap) + 2;
    const cellRight = cellLeft + qW - 4;
    const cellTop = box.y + row * (qH + gap) + 12;
    leftBound = clamp(clickXMm, cellLeft, Math.max(cellLeft, cellRight - minW));
    rightBound = cellRight;
    yMm = Math.max(cellTop, yMm);
  } else if (idType === "monthly-calendar") {
    const headerH = 14;
    const notesW = box.width * 0.18;
    const calW = box.width - notesW - 4;
    const calTop = box.y + headerH;
    const colHeadH = 7;
    const cellW = calW / 7;
    const cellH = (box.bottom - calTop - colHeadH) / 5;
    if (clickYMm < calTop) {
      leftBound = clamp(clickXMm, box.x, box.right - minW);
      rightBound = box.right - 2;
    } else if (clickXMm >= box.x + calW + 2) {
      const nx = box.x + calW + 5.5;
      leftBound = clamp(clickXMm, nx, Math.max(nx, box.right - 14));
      rightBound = box.right - 1.5;
    } else {
      const col = clamp(Math.floor((clickXMm - box.x) / cellW), 0, 6);
      const row = clamp(Math.floor((clickYMm - calTop - colHeadH) / cellH), 0, 4);
      const cellLeft = box.x + col * cellW + 1.2;
      const cellRight = box.x + (col + 1) * cellW - 1.2;
      leftBound = clamp(clickXMm, cellLeft, Math.max(cellLeft, cellRight - 14));
      rightBound = cellRight;
      yMm = Math.max(calTop + colHeadH + row * cellH + 1, yMm);
    }
  } else if (idType === "daily-planner") {
    const headerH = 14;
    const leftW = box.width * 0.56;
    const gap = 5;
    const rightX = box.x + leftW + gap;
    if (clickYMm >= box.y + headerH) {
      if (clickXMm < box.x + leftW + 2) {
        const colLeft = box.x + 15.5;
        const colRight = box.x + leftW - 2;
        leftBound = clamp(clickXMm, colLeft, Math.max(colLeft, colRight - minW));
        rightBound = colRight;
      } else {
        const colLeft = rightX + 2;
        const colRight = box.right - 2;
        leftBound = clamp(clickXMm, colLeft, Math.max(colLeft, colRight - minW));
        rightBound = colRight;
      }
    }
  } else if (idType === "task-planning") {
    const gap = 5;
    const leftW = box.width * 0.58;
    const rx = box.x + leftW + gap;
    if (clickXMm < box.x + leftW + 2) {
      leftBound = clamp(clickXMm, box.x + 2, Math.max(box.x + 2, box.x + leftW - minW - 2));
      rightBound = box.x + leftW - 2;
    } else {
      leftBound = clamp(clickXMm, rx + 2, Math.max(rx + 2, box.right - minW - 2));
      rightBound = box.right - 2;
    }
  } else if (idType === "split-column") {
    const gap = 4;
    const halfW = (box.width - gap) / 2;
    if (clickXMm < box.x + halfW + gap / 2) {
      leftBound = clamp(clickXMm, box.x + 1.5, Math.max(box.x + 1.5, box.x + halfW - minW));
      rightBound = box.x + halfW - 1.5;
    } else {
      const rx = box.x + halfW + gap;
      leftBound = clamp(clickXMm, rx + 1.5, Math.max(rx + 1.5, box.right - minW));
      rightBound = box.right - 1.5;
    }
  } else if (idType === "recipe-cards") {
    const gap = 6;
    const cardW = (box.width - gap) / 2;
    const cardH = (box.height - gap) / 2;
    const col = clamp(Math.floor((clickXMm - box.x) / (cardW + gap)), 0, 1);
    const row = clamp(Math.floor((clickYMm - box.y) / (cardH + gap)), 0, 1);
    const cx = box.x + col * (cardW + gap);
    const cy = box.y + row * (cardH + gap);
    const ingW = cardW * 0.42;
    if (clickYMm >= cy + 14) {
      if (clickXMm < cx + ingW) {
        leftBound = clamp(clickXMm, cx + 1.5, Math.max(cx + 1.5, cx + ingW - 14));
        rightBound = cx + ingW - 1.5;
      } else {
        leftBound = clamp(clickXMm, cx + ingW + 1.5, Math.max(cx + ingW + 1.5, cx + cardW - 14));
        rightBound = cx + cardW - 1.5;
      }
    } else {
      leftBound = clamp(clickXMm, cx + 2, Math.max(cx + 2, cx + cardW - 16));
      rightBound = cx + cardW - 2;
    }
  } else if (tpl.supportsLeftMarginRule && settings.showLeftMarginRule) {
    const marginOffset = Math.min(22, box.width * 0.14);
    const marginLine = geom.isBackPage ? box.right - marginOffset : box.x + marginOffset;
    if (!geom.isBackPage && clickXMm >= marginLine - 2) {
      leftBound = clamp(clickXMm, marginLine + 2, Math.max(marginLine + 2, box.right - minW));
      rightBound = box.right - 1.5;
    } else if (geom.isBackPage && clickXMm <= marginLine + 2) {
      leftBound = clamp(clickXMm, box.x + 2, Math.max(box.x + 2, marginLine - minW));
      rightBound = marginLine - 2;
    }
  }

  const widthMm = Number(Math.max(16, rightBound - leftBound).toFixed(2));
  return {
    id,
    xMm: Number(leftBound.toFixed(2)),
    yMm: Number(yMm.toFixed(2)),
    widthMm,
    text: "",
  };
}

function estimateCharWidthMm(ch: string, fontSizeMm: number): number {
  if (ch === " ") return fontSizeMm * 0.28;
  if ("ilI1.,:;'!|()[]".includes(ch)) return fontSizeMm * 0.29;
  if ("mwMW@#%&".includes(ch)) return fontSizeMm * 0.78;
  if (ch >= "A" && ch <= "Z") return fontSizeMm * 0.62;
  return fontSizeMm * 0.52;
}

function measureTextWidthMm(text: string, fontSizeMm: number): number {
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

export function resolveBlockStepMm(
  settings: PaperSettings,
  geom: SheetLayoutGeometry,
  yMm: number,
): number {
  const box = geom.contentBox;
  if (settings.paperType === "cornell-notes") {
    const headerH = 16;
    const summaryH = Math.min(48, box.height * 0.18);
    const notesTop = box.y + headerH;
    const notesBottom = box.bottom - summaryH;
    if (yMm >= notesBottom - 1) {
      return resolveStepMm(settings, Math.max(10, summaryH - 7));
    }
    if (yMm >= notesTop - 1) {
      return resolveStepMm(settings, Math.max(10, notesBottom - (notesTop + 7)));
    }
  } else if (settings.paperType === "vintage-note") {
    return resolveStepMm(settings, Math.max(10, box.height - 12));
  } else if (settings.paperType === "branded-paper") {
    const headerY = box.y + 18;
    const footerY = box.bottom - 10;
    return resolveStepMm(settings, Math.max(10, footerY - headerY - 6));
  } else if (settings.paperType === "minimal-journal") {
    return resolveStepMm(settings, Math.max(10, box.height - 11));
  }
  return resolveStepMm(settings, box.height);
}

export function computeBlockMetrics(
  block: SheetTextBlock,
  settings: PaperSettings,
  geom: SheetLayoutGeometry,
): TextBlockMetrics {
  const stepMm = resolveBlockStepMm(settings, geom, block.yMm);
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
