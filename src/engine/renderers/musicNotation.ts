import { fmt, svgLine, svgRect, svgText } from "../svgHelpers";
import type { RenderContext } from "./types";

function renderTrebleClefGlyph(x: number, staffTopY: number, staffH: number, color: string, sw: number): string {
  // Clean stylized vector G-clef curve scaled to staffH
  const s = staffH / 4;
  const cx = x + 3;
  const cy = staffTopY + 3 * s; // G line
  return `<path d="M ${fmt(cx)} ${fmt(staffTopY + 4.8 * s)} C ${fmt(cx + 1.8 * s)} ${fmt(staffTopY + 4.8 * s)} ${fmt(cx + 1.8 * s)} ${fmt(staffTopY + 3 * s)} ${fmt(cx)} ${fmt(cy)} C ${fmt(cx - 1.6 * s)} ${fmt(staffTopY + 2 * s)} ${fmt(cx - 1.2 * s)} ${fmt(staffTopY - 0.6 * s)} ${fmt(cx + 0.6 * s)} ${fmt(staffTopY - 1.2 * s)} C ${fmt(cx + 2 * s)} ${fmt(staffTopY - 0.5 * s)} ${fmt(cx + 0.2 * s)} ${fmt(staffTopY + 2.6 * s)} ${fmt(cx + 0.2 * s)} ${fmt(staffTopY + 5.2 * s)} C ${fmt(cx + 0.2 * s)} ${fmt(staffTopY + 6.1 * s)} ${fmt(cx - 1.1 * s)} ${fmt(staffTopY + 6.1 * s)} ${fmt(cx - 1.1 * s)} ${fmt(staffTopY + 5.4 * s)}" fill="none" stroke="${color}" stroke-width="${fmt(sw * 1.45)}" stroke-linecap="round"/>`;
}

function renderStaffLines(
  x1: number,
  x2: number,
  topY: number,
  lineCount: number,
  lineGap: number,
  color: string,
  sw: number,
): string {
  const out: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    const y = topY + i * lineGap;
    out.push(svgLine(x1, y, x2, y, { stroke: color, width: sw }));
  }
  return out.join("");
}

function renderChordBox(
  x: number,
  y: number,
  w: number,
  h: number,
  strings: number,
  frets: number,
  color: string,
  accent: string,
  sw: number,
): string {
  const out: string[] = [];
  // Nut bar
  out.push(svgLine(x, y, x + w, y, { stroke: accent, width: sw * 2.1 }));
  for (let s = 0; s < strings; s++) {
    const sx = x + (s / (strings - 1)) * w;
    out.push(svgLine(sx, y, sx, y + h, { stroke: color, width: sw * 0.85 }));
  }
  for (let f = 1; f <= frets; f++) {
    const fy = y + (f / frets) * h;
    out.push(svgLine(x, fy, x + w, fy, { stroke: color, width: sw * 0.85 }));
  }
  return out.join("");
}

export function renderMusicPaper(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const lineGap = Math.max(1.6, Math.min(4, settings.lineSpacingMm * 0.85));
  const staffH = lineGap * 4;
  const groupPitch = staffH + Math.max(8, lineGap * 4);
  const count = Math.max(2, Math.floor((box.height + 6) / groupPitch));
  const step = count > 1 ? (box.height - staffH) / (count - 1) : groupPitch;
  const out: string[] = [];

  for (let i = 0; i < count; i++) {
    const y = box.y + i * step;
    out.push(renderStaffLines(box.x, box.right, y, 5, lineGap, lineColor, sw));
    out.push(svgLine(box.x, y, box.x, y + staffH, { stroke: accentColor, width: sw * 1.4 }));
    out.push(svgLine(box.right, y, box.right, y + staffH, { stroke: accentColor, width: sw * 1.4 }));
  }
  return out.join("");
}

export function renderGuitarTab(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  // Top chord grid row (6 chords across)
  const chordCols = 6;
  const chordBoxW = 13;
  const chordBoxH = 14;
  const topH = 22;
  const chordSpacing = (box.width - chordCols * chordBoxW) / Math.max(1, chordCols - 1);
  for (let c = 0; c < chordCols; c++) {
    const cx = box.x + c * (chordBoxW + chordSpacing);
    out.push(renderChordBox(cx, box.y + 4, chordBoxW, chordBoxH, 6, 4, lineColor, accentColor, sw));
  }

  // Lower 6-line TAB staves
  const stringGap = 2.8;
  const tabH = stringGap * 5;
  const startY = box.y + topH + 5;
  const pitch = Math.max(tabH + 9, Math.min(34, settings.lineSpacingMm));
  const count = Math.max(2, Math.floor((box.bottom - startY) / pitch));
  const step = count > 1 ? (box.bottom - startY - tabH) / (count - 1) : pitch;

  for (let i = 0; i < count; i++) {
    const y = startY + i * step;
    out.push(renderStaffLines(box.x, box.right, y, 6, stringGap, lineColor, sw));
    out.push(svgLine(box.x, y, box.x, y + tabH, { stroke: accentColor, width: sw * 1.5 }));
    out.push(svgLine(box.right, y, box.right, y + tabH, { stroke: accentColor, width: sw * 1.5 }));
    for (let b = 1; b < 4; b++) {
      const bx = box.x + (b / 4) * box.width;
      out.push(svgLine(bx, y, bx, y + tabH, { stroke: lineColor, width: sw }));
    }
    ["T", "A", "B"].forEach((ch, idx) => {
      out.push(svgText(box.x + 2.5, y + 3.8 + idx * 4.2, ch, { fill: textColor, sizeMm: 3, weight: "700" }));
    });
  }
  return out.join("");
}

export function renderBassTab(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const stringGap = Math.max(2.6, Math.min(5, settings.lineSpacingMm * 0.85));
  const tabH = stringGap * 3;
  const pitch = tabH + 12;
  const count = Math.max(2, Math.floor((box.height + 8) / pitch));
  const step = count > 1 ? (box.height - tabH) / (count - 1) : pitch;
  const strings = ["G", "D", "A", "E"];
  const out: string[] = [];

  for (let i = 0; i < count; i++) {
    const y = box.y + i * step;
    out.push(renderStaffLines(box.x + 5, box.right, y, 4, stringGap, lineColor, sw));
    out.push(svgLine(box.x + 5, y, box.x + 5, y + tabH, { stroke: accentColor, width: sw * 1.5 }));
    out.push(svgLine(box.right, y, box.right, y + tabH, { stroke: accentColor, width: sw * 1.5 }));
    for (let b = 1; b < 4; b++) {
      const bx = box.x + 5 + (b / 4) * (box.width - 5);
      out.push(svgLine(bx, y, bx, y + tabH, { stroke: lineColor, width: sw }));
    }
    strings.forEach((sName, idx) => {
      out.push(svgText(box.x + 1, y + idx * stringGap + 0.9, sName, { fill: textColor, sizeMm: 2.5, weight: "700" }));
    });
  }
  return out.join("");
}

export function renderStaffUkuleleTab(ctx: RenderContext): string {
  const { geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const staffGap = 2.2;
  const staffH = staffGap * 4;
  const tabGap = 2.8;
  const tabH = tabGap * 3;
  const pairGap = 6;
  const systemH = staffH + pairGap + tabH;
  const count = Math.max(2, Math.floor((box.height + 10) / (systemH + 12)));
  const step = count > 1 ? (box.height - systemH) / (count - 1) : systemH + 12;
  const ukeStrings = ["A", "E", "C", "G"];
  const out: string[] = [];

  for (let i = 0; i < count; i++) {
    const y = box.y + i * step;
    const tabY = y + staffH + pairGap;
    out.push(renderStaffLines(box.x + 6, box.right, y, 5, staffGap, lineColor, sw));
    out.push(renderTrebleClefGlyph(box.x + 7, y, staffH, accentColor, sw));
    out.push(renderStaffLines(box.x + 6, box.right, tabY, 4, tabGap, lineColor, sw));
    // Left connecting bracket
    out.push(svgLine(box.x + 6, y, box.x + 6, tabY + tabH, { stroke: accentColor, width: sw * 1.7 }));
    out.push(svgLine(box.right, y, box.right, tabY + tabH, { stroke: accentColor, width: sw * 1.5 }));
    for (let b = 1; b < 4; b++) {
      const bx = box.x + 6 + (b / 4) * (box.width - 6);
      out.push(svgLine(bx, y, bx, y + staffH, { stroke: lineColor, width: sw }));
      out.push(svgLine(bx, tabY, bx, tabY + tabH, { stroke: lineColor, width: sw }));
    }
    ukeStrings.forEach((sName, idx) => {
      out.push(svgText(box.x + 1, tabY + idx * tabGap + 0.9, sName, { fill: textColor, sizeMm: 2.3, weight: "700" }));
    });
  }
  return out.join("");
}

export function renderTrebleChordDiagrams(ctx: RenderContext): string {
  const { geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const chordW = 10;
  const chordH = 11;
  const staffGap = 2.2;
  const staffH = staffGap * 4;
  const systemH = chordH + 6 + staffH;
  const count = Math.max(2, Math.floor((box.height + 10) / (systemH + 14)));
  const step = count > 1 ? (box.height - systemH) / (count - 1) : systemH + 14;
  const measures = 4;
  const out: string[] = [];

  for (let i = 0; i < count; i++) {
    const y = box.y + i * step;
    const staffY = y + chordH + 6;
    const measureW = box.width / measures;
    for (let m = 0; m < measures; m++) {
      const mx = box.x + m * measureW;
      out.push(renderChordBox(mx + 4, y, chordW, chordH, 6, 4, lineColor, accentColor, sw));
      if (measureW > 32) {
        out.push(renderChordBox(mx + measureW / 2 + 2, y, chordW, chordH, 6, 4, lineColor, accentColor, sw));
      }
      if (m > 0) {
        out.push(svgLine(mx, staffY, mx, staffY + staffH, { stroke: lineColor, width: sw }));
      }
    }
    out.push(renderStaffLines(box.x, box.right, staffY, 5, staffGap, lineColor, sw));
    out.push(renderTrebleClefGlyph(box.x + 1.5, staffY, staffH, accentColor, sw));
    out.push(svgLine(box.x, staffY, box.x, staffY + staffH, { stroke: accentColor, width: sw * 1.5 }));
    out.push(svgLine(box.right, staffY, box.right, staffY + staffH, { stroke: accentColor, width: sw * 1.5 }));
  }
  void svgRect;
  return out.join("");
}
