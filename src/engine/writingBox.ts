import { getTemplateSpec } from "../data/templates";
import type { PaperSettings } from "../types/paper";
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
  } else if (tpl.supportsLeftMarginRule && settings.showLeftMarginRule) {
    const marginOffset = Math.min(22, box.width * 0.14);
    xMm = geom.isBackPage ? box.x + 2 : box.x + marginOffset + 2;
    widthMm = Math.max(10, box.width - marginOffset - 4);
  }

  const rawSpacing = settings.lineSpacingMm;
  const useTemplateStep = rawSpacing >= 4.5 && rawSpacing <= 14;
  const stepMm = useTemplateStep
    ? computeGridStep(stepSourceHeight, rawSpacing, settings.layoutMode).stepMm
    : Math.max(5.5, Math.min(11, rawSpacing < 4.5 ? 7 : 9));

  const scale = Number.isFinite(settings.inkFontScale)
    ? Math.max(0.75, Math.min(1.4, settings.inkFontScale))
    : 1;
  const fontSizeMm = Math.min(stepMm * 0.72, Math.max(2.6, stepMm * 0.54 * scale));
  const baselineOffsetMm = stepMm - Math.max(0.7, stepMm * 0.15);
  const cssLineCenterBaseline = (stepMm + fontSizeMm * 0.72) / 2;
  const textareaPaddingTopMm = Math.max(0, baselineOffsetMm - cssLineCenterBaseline);
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
          // Break single oversized token character by character
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
