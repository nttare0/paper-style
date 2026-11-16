import { computeGridStep } from "../geometry";
import { fmt, svgCircle, svgLine, svgRect, svgText } from "../svgHelpers";
import type { RenderContext } from "./types";

function clipBox(id: string, box: RenderContext["geom"]["contentBox"], inner: string): string {
  return `<defs><clipPath id="${id}"><rect x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.width)}" height="${fmt(box.height)}"/></clipPath></defs><g clip-path="url(#${id})">${inner}</g>`;
}

export function renderCalligraphyPaper(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const xH = Math.max(4, settings.lineSpacingMm);
  const groupH = xH * 3; // ascender + x-height + descender
  const gap = Math.max(4, xH * 0.6);
  const out: string[] = [];

  for (let y = box.y; y + groupH <= box.bottom + 0.01; y += groupH + gap) {
    out.push(svgLine(box.x, y, box.right, y, { stroke: lineColor, width: sw * 0.9, dash: 'stroke-dasharray="2 2"' })); // ascender
    out.push(svgLine(box.x, y + xH, box.right, y + xH, { stroke: lineColor, width: sw })); // waist
    out.push(svgLine(box.x, y + 2 * xH, box.right, y + 2 * xH, { stroke: accentColor, width: sw * 1.4 })); // baseline
    out.push(svgLine(box.x, y + 3 * xH, box.right, y + 3 * xH, { stroke: lineColor, width: sw * 0.9, dash: 'stroke-dasharray="2 2"' })); // descender
  }
  return out.join("");
}

export function renderModernCalligraphySlant(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const angleDeg = Math.max(35, Math.min(85, settings.slantAngleDeg || 55));
  const rad = (angleDeg * Math.PI) / 180;
  const xH = Math.max(4, settings.lineSpacingMm);
  const groupH = xH * 3;
  const gap = Math.max(4, xH * 0.55);
  const out: string[] = [];

  // Horizontal x-height guide bands
  for (let y = box.y; y + groupH <= box.bottom + 0.01; y += groupH + gap) {
    out.push(svgLine(box.x, y, box.right, y, { stroke: lineColor, width: sw * 0.8, opacity: 0.7 }));
    out.push(svgLine(box.x, y + xH, box.right, y + xH, { stroke: lineColor, width: sw }));
    out.push(svgLine(box.x, y + 2 * xH, box.right, y + 2 * xH, { stroke: accentColor, width: sw * 1.5 }));
    out.push(svgLine(box.x, y + 3 * xH, box.right, y + 3 * xH, { stroke: lineColor, width: sw * 0.8, opacity: 0.7 }));
  }

  // Forward-slanting angle lines across whole content area
  const dxShift = box.height / Math.tan(rad);
  const slantStep = Math.max(5, xH * 1.4);
  for (let x = box.x - dxShift; x <= box.right + dxShift; x += slantStep) {
    out.push(svgLine(x, box.bottom, x + dxShift, box.y, { stroke: lineColor, width: sw * 0.85, opacity: 0.55 }));
  }
  return clipBox("slant-callig-clip", box, out.join(""));
}

export function renderSlantRuled(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const band = Math.max(3.5, settings.lineSpacingMm);
  const angleDeg = Math.max(45, Math.min(82, settings.slantAngleDeg || 65));
  const rad = (angleDeg * Math.PI) / 180;
  const out: string[] = [];

  // Horizontal double-line pairs (base writing band + inter-row gap)
  for (let y = box.y + band; y + band <= box.bottom + 0.01; y += band * 2.4) {
    out.push(svgLine(box.x, y, box.right, y, { stroke: lineColor, width: sw * 1.1 }));
    out.push(svgLine(box.x, y + band, box.right, y + band, { stroke: lineColor, width: sw * 1.1 }));
  }

  // Diagonal slant guides forming parallelograms
  const dxShift = box.height / Math.tan(rad);
  const diagStep = Math.max(8, band * 2.2);
  for (let x = box.x - dxShift; x <= box.right + dxShift; x += diagStep) {
    out.push(svgLine(x, box.bottom, x + dxShift, box.y, { stroke: lineColor, width: sw * 0.75, opacity: 0.6 }));
  }

  const clipped = clipBox("slant-ruled-clip", box, out.join(""));
  if (settings.showLeftMarginRule) {
    const mx = geom.isBackPage ? box.right - 20 : box.x + 20;
    return clipped + svgLine(mx, box.y, mx, box.bottom, { stroke: accentColor, width: sw * 1.5 });
  }
  return clipped;
}

export function renderCharacterGrid(
  ctx: RenderContext,
  variant:
    | "mi-zi-ge"
    | "hui-gong-ge"
    | "jiu-gong-ge"
    | "chinese-tianzi"
    | "hardpen-hui-gong-ge"
    | "composition",
): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const cellSize = Math.max(6, settings.lineSpacingMm);
  const gapY = variant === "composition" ? 2.5 : 3;
  const cols = computeGridStep(box.width, cellSize, settings.layoutMode);
  const stepX = cols.stepMm;
  const cellW = Math.min(stepX, cellSize + 4);
  const rows = Math.max(1, Math.floor((box.height + gapY) / (cellW + gapY)));
  const totalRowSpan = rows * cellW + (rows - 1) * gapY;
  const rowPitch = rows > 1 && settings.layoutMode === "fill" ? cellW + (box.height - rows * cellW) / (rows - 1) : cellW + gapY;
  const colPitch = settings.layoutMode === "fill" && cols.count > 1 ? (box.width - cols.count * cellW) / Math.max(1, cols.count - 1) + cellW : cellW;
  void totalRowSpan;
  const out: string[] = [];

  for (let r = 0; r < rows; r++) {
    const y = box.y + r * rowPitch;
    if (y + cellW > box.bottom + 0.05) break;
    for (let c = 0; c < cols.count; c++) {
      const x = box.x + c * colPitch;
      if (x + cellW > box.right + 0.05) break;
      out.push(svgRect(x, y, cellW, cellW, { stroke: accentColor, strokeWidth: sw * 1.25 }));
      if (variant === "chinese-tianzi" || variant === "mi-zi-ge") {
        out.push(svgLine(x + cellW / 2, y, x + cellW / 2, y + cellW, { stroke: lineColor, width: sw * 0.75, dash: 'stroke-dasharray="1.5 1.5"' }));
        out.push(svgLine(x, y + cellW / 2, x + cellW, y + cellW / 2, { stroke: lineColor, width: sw * 0.75, dash: 'stroke-dasharray="1.5 1.5"' }));
      }
      if (variant === "mi-zi-ge") {
        out.push(svgLine(x, y, x + cellW, y + cellW, { stroke: lineColor, width: sw * 0.65, dash: 'stroke-dasharray="1.5 1.5"' }));
        out.push(svgLine(x + cellW, y, x, y + cellW, { stroke: lineColor, width: sw * 0.65, dash: 'stroke-dasharray="1.5 1.5"' }));
      }
      if (variant === "hui-gong-ge" || variant === "hardpen-hui-gong-ge") {
        const iw = cellW * 0.56;
        const ih = cellW * 0.64;
        const ix = x + (cellW - iw) / 2;
        const iy = y + (cellW - ih) / 2;
        out.push(svgRect(ix, iy, iw, ih, { stroke: lineColor, strokeWidth: sw * 0.75, dash: 'stroke-dasharray="1.5 1.5"' }));
      }
      if (variant === "jiu-gong-ge") {
        for (let k = 1; k <= 2; k++) {
          const sx = x + (cellW * k) / 3;
          const sy = y + (cellW * k) / 3;
          out.push(svgLine(sx, y, sx, y + cellW, { stroke: lineColor, width: sw * 0.7, dash: 'stroke-dasharray="1.2 1.2"' }));
          out.push(svgLine(x, sy, x + cellW, sy, { stroke: lineColor, width: sw * 0.7, dash: 'stroke-dasharray="1.2 1.2"' }));
        }
      }
    }
  }
  return out.join("");
}

export function renderGenkoYoshi(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const headerH = 14;
  const out: string[] = [];

  out.push(svgText(box.x, box.y + 6, "年  月  日  （　）", { fill: textColor, sizeMm: 3.1, weight: "600" }));
  out.push(svgText(box.right, box.y + 6, "［　　　　　　　　］", { fill: textColor, sizeMm: 3.1, anchor: "end", weight: "600" }));

  const gridTop = box.y + headerH;
  const cellSize = Math.max(8, settings.lineSpacingMm);
  const gap = 2.4;
  const cols = Math.max(4, Math.floor((box.width + gap) / (cellSize + gap)));
  const colW = (box.width - (cols - 1) * gap) / cols;
  const rows = Math.max(4, Math.floor((box.bottom - gridTop) / colW));
  const actualH = rows * colW;

  for (let c = 0; c < cols; c++) {
    const cx = box.x + c * (colW + gap);
    out.push(svgRect(cx, gridTop, colW, actualH, { stroke: accentColor, strokeWidth: sw * 1.15 }));
    out.push(svgLine(cx + colW / 2, gridTop, cx + colW / 2, gridTop + actualH, { stroke: lineColor, width: sw * 0.55, opacity: 0.45, dash: 'stroke-dasharray="1.2 1.2"' }));
    for (let r = 0; r < rows; r++) {
      const ry = gridTop + r * colW;
      if (r > 0) {
        out.push(svgLine(cx, ry, cx + colW, ry, { stroke: accentColor, width: sw * 0.9 }));
      }
      out.push(svgLine(cx, ry + colW / 2, cx + colW, ry + colW / 2, { stroke: lineColor, width: sw * 0.55, opacity: 0.45, dash: 'stroke-dasharray="1.2 1.2"' }));
    }
  }
  return out.join("");
}

export function renderFourLineBands(
  ctx: RenderContext,
  variant:
    | "pinyin-practice"
    | "english-practice"
    | "english-handwriting"
    | "us-handwriting"
    | "us-handwriting-half"
    | "german-three-line"
    | "german-three-line-border"
    | "lineatur-3"
    | "brazilian-calligraphy",
): string {
  const { settings, geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  let workBox = box;
  if (variant === "us-handwriting-half") {
    const drawH = box.height * 0.48;
    out.push(svgRect(box.x, box.y, box.width, drawH, { stroke: accentColor, strokeWidth: sw * 1.5, rx: 2 }));
    workBox = { ...box, y: box.y + drawH + 8, height: box.height - drawH - 8 };
  } else if (variant === "lineatur-3") {
    const headH = 14;
    out.push(svgRect(box.x, box.y, box.width, box.height, { stroke: accentColor, strokeWidth: sw * 1.5 }));
    out.push(svgText(box.x + 3, box.y + 8, "Name: ____________________   Datum: __________   Blatt: ___", { fill: textColor, sizeMm: 3, weight: "600" }));
    out.push(svgLine(box.x, box.y + headH, box.right, box.y + headH, { stroke: accentColor, width: sw * 1.3 }));
    workBox = {
      x: box.x + 8,
      y: box.y + headH + 4,
      width: box.width - 12,
      height: box.height - headH - 8,
      right: box.right - 4,
      bottom: box.bottom - 4,
    };
  } else if (variant === "german-three-line-border" || variant === "english-handwriting") {
    out.push(svgRect(box.x, box.y, box.width, box.height, { stroke: accentColor, strokeWidth: sw * 1.4 }));
    workBox = {
      x: box.x + 4,
      y: box.y + 4,
      width: box.width - 8,
      height: box.height - 8,
      right: box.right - 4,
      bottom: box.bottom - 4,
    };
  }

  if (variant === "brazilian-calligraphy") {
    const mx = workBox.x + 14;
    out.push(svgLine(mx, workBox.y, mx, workBox.bottom, { stroke: "#38BDF8", width: sw * 1.4 }));
  }

  const baseUnit = Math.max(3, Math.min(7, settings.lineSpacingMm * (variant === "pinyin-practice" ? 0.25 : 0.7)));
  const isThreeBand =
    variant === "german-three-line" ||
    variant === "german-three-line-border" ||
    variant === "lineatur-3" ||
    variant === "brazilian-calligraphy" ||
    variant === "pinyin-practice" ||
    variant === "english-practice" ||
    variant === "english-handwriting";

  if (isThreeBand) {
    const upper = variant === "brazilian-calligraphy" ? baseUnit * 1.4 : baseUnit;
    const mid = variant === "brazilian-calligraphy" ? baseUnit * 0.75 : baseUnit;
    const lower = upper;
    const totalH = upper + mid + lower;
    const gap = Math.max(3.5, baseUnit * 1.1);
    let rowIdx = 1;
    for (let y = workBox.y; y + totalH <= workBox.bottom + 0.01; y += totalH + gap) {
      if (variant === "lineatur-3") {
        // Highlight middle writing bar & print odd row numbers
        out.push(svgRect(workBox.x, y + upper, workBox.width, mid, { fill: lineColor, fillOpacity: 0.14 }));
        if (rowIdx % 2 === 1) {
          out.push(svgText(box.x + 2.5, y + upper + mid * 0.8, String(rowIdx), { fill: textColor, sizeMm: 2.5 }));
        }
        rowIdx++;
      }
      out.push(svgLine(workBox.x, y, workBox.right, y, { stroke: lineColor, width: sw }));
      out.push(svgLine(workBox.x, y + upper, workBox.right, y + upper, { stroke: lineColor, width: sw }));
      out.push(svgLine(workBox.x, y + upper + mid, workBox.right, y + upper + mid, { stroke: accentColor, width: sw * 1.3 }));
      out.push(svgLine(workBox.x, y + totalH, workBox.right, y + totalH, { stroke: lineColor, width: sw }));
      if (variant === "german-three-line" || variant === "german-three-line-border") {
        out.push(svgLine(workBox.x, y, workBox.x, y + totalH, { stroke: lineColor, width: sw * 0.8 }));
        out.push(svgLine(workBox.right, y, workBox.right, y + totalH, { stroke: lineColor, width: sw * 0.8 }));
      }
    }
  } else {
    // US Handwriting: blue top, dashed blue midline, red baseline
    const bandH = Math.max(6, settings.lineSpacingMm * 1.4);
    const gap = bandH * 0.55;
    for (let y = workBox.y; y + bandH <= workBox.bottom + 0.01; y += bandH + gap) {
      out.push(svgLine(workBox.x, y, workBox.right, y, { stroke: lineColor, width: sw * 1.2 }));
      out.push(svgLine(workBox.x, y + bandH / 2, workBox.right, y + bandH / 2, { stroke: lineColor, width: sw, dash: 'stroke-dasharray="2.5 2"' }));
      out.push(svgLine(workBox.x, y + bandH, workBox.right, y + bandH, { stroke: accentColor, width: sw * 1.4 }));
    }
  }
  return out.join("");
}

export function renderPinyinTianzi(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const cellS = Math.max(10, Math.min(20, settings.lineSpacingMm * 0.75));
  const pinyinH = cellS * 0.55;
  const rowGap = 4;
  const rowH = pinyinH + cellS;
  const cols = Math.max(4, Math.floor(box.width / cellS));
  const actualCell = box.width / cols;
  const out: string[] = [];

  for (let y = box.y; y + rowH <= box.bottom + 0.01; y += rowH + rowGap) {
    // Pinyin 4-line band
    for (let l = 0; l < 4; l++) {
      const ly = y + (l / 3) * pinyinH;
      out.push(svgLine(box.x, ly, box.right, ly, { stroke: lineColor, width: sw * (l === 2 ? 1.15 : 0.8) }));
    }
    // Tianzi cells below
    const ty = y + pinyinH;
    for (let c = 0; c < cols; c++) {
      const cx = box.x + c * actualCell;
      out.push(svgRect(cx, ty, actualCell, cellS, { stroke: accentColor, strokeWidth: sw * 1.2 }));
      out.push(svgLine(cx + actualCell / 2, ty, cx + actualCell / 2, ty + cellS, { stroke: lineColor, width: sw * 0.65, dash: 'stroke-dasharray="1.3 1.3"' }));
      out.push(svgLine(cx, ty + cellS / 2, cx + actualCell, ty + cellS / 2, { stroke: lineColor, width: sw * 0.65, dash: 'stroke-dasharray="1.3 1.3"' }));
    }
  }
  return out.join("");
}

export function renderChineseStudySheet(
  ctx: RenderContext,
  variant: "chinese-preview-card" | "chinese-english-word",
): string {
  const { geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  if (variant === "chinese-preview-card") {
    const headers = ["汉字", "拼音", "部首 / 笔画", "组词 / 例句"];
    const ratios = [0.16, 0.2, 0.22, 0.42];
    const rowH = 18;
    const headH = 10;
    out.push(svgRect(box.x, box.y, box.width, headH, { fill: accentColor, fillOpacity: 0.1, stroke: accentColor, strokeWidth: sw * 1.3 }));
    let cx = box.x;
    headers.forEach((h, i) => {
      const w = box.width * ratios[i]!;
      out.push(svgText(cx + w / 2, box.y + 6.5, h, { fill: accentColor, sizeMm: 3, anchor: "middle", weight: "700" }));
      if (i > 0) out.push(svgLine(cx, box.y, cx, box.bottom, { stroke: accentColor, width: sw * 1.1 }));
      cx += w;
    });
    const rows = Math.max(4, Math.floor((box.height - headH) / rowH));
    for (let r = 0; r < rows; r++) {
      const ry = box.y + headH + r * rowH;
      out.push(svgRect(box.x, ry, box.width, rowH, { stroke: lineColor, strokeWidth: sw }));
      // Tianzi box inside col 0
      const boxS = Math.min(rowH - 3, box.width * ratios[0]! - 4);
      const bx = box.x + (box.width * ratios[0]! - boxS) / 2;
      const by = ry + (rowH - boxS) / 2;
      out.push(svgRect(bx, by, boxS, boxS, { stroke: accentColor, strokeWidth: sw }));
      out.push(svgLine(bx + boxS / 2, by, bx + boxS / 2, by + boxS, { stroke: lineColor, width: sw * 0.6, dash: 'stroke-dasharray="1.2 1.2"' }));
      out.push(svgLine(bx, by + boxS / 2, bx + boxS, by + boxS / 2, { stroke: lineColor, width: sw * 0.6, dash: 'stroke-dasharray="1.2 1.2"' }));
    }
    return out.join("");
  }

  // chinese-english-word
  const cols = 2;
  const colW = box.width / cols;
  const rowH = 13;
  const rows = Math.max(6, Math.floor((box.height - 10) / rowH));
  out.push(svgText(box.x + colW * 0.25, box.y + 5, "ENGLISH WORD", { fill: accentColor, sizeMm: 2.8, anchor: "middle", weight: "700" }));
  out.push(svgText(box.x + colW * 0.75, box.y + 5, "中文释义", { fill: accentColor, sizeMm: 2.8, anchor: "middle", weight: "700" }));
  out.push(svgText(box.x + colW * 1.25, box.y + 5, "ENGLISH WORD", { fill: accentColor, sizeMm: 2.8, anchor: "middle", weight: "700" }));
  out.push(svgText(box.x + colW * 1.75, box.y + 5, "中文释义", { fill: accentColor, sizeMm: 2.8, anchor: "middle", weight: "700" }));
  void textColor;

  for (let c = 0; c < cols; c++) {
    const cx = box.x + c * colW;
    for (let r = 0; r < rows; r++) {
      const ry = box.y + 8 + r * rowH;
      out.push(svgRect(cx, ry, colW, rowH, { stroke: lineColor, strokeWidth: sw }));
      out.push(svgLine(cx + colW * 0.52, ry, cx + colW * 0.52, ry + rowH, { stroke: lineColor, width: sw }));
      for (let l = 1; l <= 2; l++) {
        const ly = ry + (l / 3) * rowH;
        out.push(svgLine(cx + 1, ly, cx + colW * 0.51, ly, { stroke: lineColor, width: sw * 0.65, dash: 'stroke-dasharray="1.5 1.5"' }));
      }
    }
  }
  return out.join("");
}

export function renderPracticePaper(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const cols = 3;
  const out: string[] = [];
  const step = Math.max(4, settings.lineSpacingMm);
  const rows = computeGridStep(box.height, step, settings.layoutMode);

  for (let i = 1; i <= rows.count; i++) {
    const y = box.y + i * rows.stepMm;
    out.push(svgLine(box.x, y, box.right, y, { stroke: lineColor, width: sw, dash: 'stroke-dasharray="2.5 2"' }));
  }
  for (let c = 1; c < cols; c++) {
    const x = box.x + (c / cols) * box.width;
    out.push(svgLine(x, box.y, x, box.bottom, { stroke: accentColor, width: sw * 1.3 }));
  }
  return out.join("");
}

export function renderBraillePractice(ctx: RenderContext): string {
  const { geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const rows = 6;
  const cols = 16;
  const rowH = box.height / rows;
  const colW = box.width / cols;
  const dotR = Math.min(colW * 0.11, rowH * 0.08, 1.3);
  const out: string[] = [];

  for (let r = 0; r < rows; r++) {
    const ry = box.y + r * rowH;
    if (r > 0) {
      out.push(svgLine(box.x, ry, box.right, ry, { stroke: accentColor, width: sw }));
    }
    for (let c = 0; c < cols; c++) {
      const cx = box.x + c * colW;
      const dx = colW * 0.34;
      const dy = rowH * 0.2;
      const x1 = cx + (colW - dx) / 2;
      const x2 = x1 + dx;
      const y1 = ry + (rowH - dy * 2) / 2;
      for (let dr = 0; dr < 3; dr++) {
        out.push(svgCircle(x1, y1 + dr * dy, dotR, { stroke: lineColor, strokeWidth: sw * 0.9 }));
        out.push(svgCircle(x2, y1 + dr * dy, dotR, { stroke: lineColor, strokeWidth: sw * 0.9 }));
      }
    }
  }
  return out.join("");
}

export function renderErrorCorrection(ctx: RenderContext): string {
  const { geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const cols = [
    { label: "QUESTION / PROBLEM", ratio: 0.32 },
    { label: "MY ANSWER & MISTAKE", ratio: 0.28 },
    { label: "CORRECT SOLUTION & KEY TAKEAWAY", ratio: 0.4 },
  ];
  const headH = 10;
  const rowH = 38;
  const out: string[] = [];

  out.push(svgRect(box.x, box.y, box.width, box.height, { stroke: accentColor, strokeWidth: sw * 1.5 }));
  out.push(svgRect(box.x, box.y, box.width, headH, { fill: accentColor, fillOpacity: 0.1, stroke: accentColor, strokeWidth: sw * 1.2 }));

  let cx = box.x;
  cols.forEach((col, i) => {
    const w = box.width * col.ratio;
    out.push(svgText(cx + 3, box.y + 6.5, col.label, { fill: accentColor, sizeMm: 2.7, weight: "700" }));
    if (i > 0) out.push(svgLine(cx, box.y, cx, box.bottom, { stroke: accentColor, width: sw * 1.2 }));
    cx += w;
  });

  for (let y = box.y + headH + rowH; y < box.bottom - 5; y += rowH) {
    out.push(svgLine(box.x, y, box.right, y, { stroke: lineColor, width: sw * 1.1 }));
  }
  return out.join("");
}
