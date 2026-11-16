import { computeGridStep } from "../geometry";
import { fmt, svgCircle, svgLine, svgRect, svgText } from "../svgHelpers";
import type { RenderContext } from "./types";

export function renderHorizontalLines(
  ctx: RenderContext,
  box = ctx.geom.contentBox,
  spacingOverride?: number,
): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const sw = geom.strokeWidthMm;
  const dash = geom.dashArrayAttr;
  const spacing = spacingOverride ?? settings.lineSpacingMm;
  const { count, stepMm } = computeGridStep(box.height, spacing, settings.layoutMode);
  const out: string[] = [];

  for (let i = 1; i <= count; i++) {
    const y = box.y + i * stepMm;
    if (y > box.bottom + 0.01) break;
    out.push(svgLine(box.x, y, box.right, y, { stroke: lineColor, width: sw, dash }));
  }

  if (settings.showLeftMarginRule && box === geom.contentBox) {
    const marginOffset = Math.min(22, box.width * 0.14);
    const rx = geom.isBackPage ? box.right - marginOffset : box.x + marginOffset;
    out.push(
      svgLine(rx, box.y, rx, box.bottom, {
        stroke: accentColor,
        width: sw * 1.4,
        opacity: 0.85,
      }),
    );
  }
  return out.join("");
}

export function renderVerticalLines(ctx: RenderContext): string {
  const { settings, geom, lineColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const { count, stepMm } = computeGridStep(
    box.width,
    settings.lineSpacingMm,
    settings.layoutMode,
  );
  const out: string[] = [];
  for (let i = 0; i <= count; i++) {
    const x = box.x + i * stepMm;
    if (x > box.right + 0.01) break;
    out.push(
      svgLine(x, box.y, x, box.bottom, {
        stroke: lineColor,
        width: sw,
        dash: geom.dashArrayAttr,
      }),
    );
  }
  return out.join("");
}

export function renderGrid(
  ctx: RenderContext,
  box = ctx.geom.contentBox,
  spacingOverride?: number,
  majorEvery?: number,
): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const sw = geom.strokeWidthMm;
  const dash = geom.dashArrayAttr;
  const spacing = spacingOverride ?? settings.lineSpacingMm;
  const cols = computeGridStep(box.width, spacing, settings.layoutMode);
  const rows = computeGridStep(box.height, spacing, settings.layoutMode);
  const out: string[] = [];

  for (let c = 0; c <= cols.count; c++) {
    const x = box.x + c * cols.stepMm;
    if (x > box.right + 0.01) break;
    const isMajor = majorEvery ? c % majorEvery === 0 : false;
    out.push(
      svgLine(x, box.y, x, box.y + rows.count * rows.stepMm, {
        stroke: isMajor ? accentColor : lineColor,
        width: isMajor ? sw * 1.7 : sw,
        dash: isMajor ? undefined : dash,
        opacity: isMajor ? 0.9 : 0.85,
      }),
    );
  }

  for (let r = 0; r <= rows.count; r++) {
    const y = box.y + r * rows.stepMm;
    if (y > box.bottom + 0.01) break;
    const isMajor = majorEvery ? r % majorEvery === 0 : false;
    out.push(
      svgLine(box.x, y, box.x + cols.count * cols.stepMm, y, {
        stroke: isMajor ? accentColor : lineColor,
        width: isMajor ? sw * 1.7 : sw,
        dash: isMajor ? undefined : dash,
        opacity: isMajor ? 0.9 : 0.85,
      }),
    );
  }
  return out.join("");
}

export function renderDotGrid(
  ctx: RenderContext,
  box = ctx.geom.contentBox,
  spacingOverride?: number,
): string {
  const { settings, geom, lineColor } = ctx;
  const spacing = spacingOverride ?? settings.lineSpacingMm;
  const cols = computeGridStep(box.width, spacing, settings.layoutMode);
  const rows = computeGridStep(box.height, spacing, settings.layoutMode);
  const rDot = Math.max(0.22, geom.strokeWidthMm * 1.6);
  const out: string[] = [];

  for (let r = 0; r <= rows.count; r++) {
    const y = box.y + r * rows.stepMm;
    if (y > box.bottom + 0.01) break;
    for (let c = 0; c <= cols.count; c++) {
      const x = box.x + c * cols.stepMm;
      if (x > box.right + 0.01) break;
      out.push(svgCircle(x, y, rDot, { fill: lineColor }));
    }
  }
  return out.join("");
}

export function renderCrossGrid(ctx: RenderContext): string {
  const { settings, geom, lineColor } = ctx;
  const box = geom.contentBox;
  const cols = computeGridStep(box.width, settings.lineSpacingMm, settings.layoutMode);
  const rows = computeGridStep(box.height, settings.lineSpacingMm, settings.layoutMode);
  const arm = Math.min(1.6, Math.min(cols.stepMm, rows.stepMm) * 0.22);
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  for (let r = 0; r <= rows.count; r++) {
    const y = box.y + r * rows.stepMm;
    for (let c = 0; c <= cols.count; c++) {
      const x = box.x + c * cols.stepMm;
      out.push(svgLine(x - arm, y, x + arm, y, { stroke: lineColor, width: sw }));
      out.push(svgLine(x, y - arm, x, y + arm, { stroke: lineColor, width: sw }));
    }
  }
  return out.join("");
}

export function renderSplitColumn(ctx: RenderContext): string {
  const { geom, accentColor } = ctx;
  const box = geom.contentBox;
  const gap = 4;
  const halfW = (box.width - gap) / 2;
  const leftBox = {
    x: box.x,
    y: box.y,
    width: halfW,
    height: box.height,
    right: box.x + halfW,
    bottom: box.bottom,
  };
  const rightBox = {
    x: box.x + halfW + gap,
    y: box.y,
    width: halfW,
    height: box.height,
    right: box.right,
    bottom: box.bottom,
  };
  const divider = svgLine(box.x + halfW + gap / 2, box.y, box.x + halfW + gap / 2, box.bottom, {
    stroke: accentColor,
    width: geom.strokeWidthMm * 1.5,
  });
  return renderGrid(ctx, leftBox) + divider + renderHorizontalLines(ctx, rightBox);
}

export function renderCornellNotes(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const headerH = 16;
  const summaryH = Math.min(48, box.height * 0.18);
  const cueW = Math.min(58, box.width * 0.3);
  const notesTop = box.y + headerH;
  const notesBottom = box.bottom - summaryH;
  const cueX = geom.isBackPage ? box.right - cueW : box.x + cueW;
  const notesBox = {
    x: geom.isBackPage ? box.x : cueX,
    y: notesTop,
    width: box.width - cueW,
    height: Math.max(10, notesBottom - notesTop),
    right: geom.isBackPage ? cueX : box.right,
    bottom: notesBottom,
  };

  const out: string[] = [];
  out.push(svgRect(box.x, box.y, box.width, box.height, { stroke: accentColor, strokeWidth: sw * 1.6 }));
  out.push(svgLine(box.x, notesTop, box.right, notesTop, { stroke: accentColor, width: sw * 1.6 }));
  out.push(svgLine(box.x, notesBottom, box.right, notesBottom, { stroke: accentColor, width: sw * 1.6 }));
  out.push(svgLine(cueX, notesTop, cueX, notesBottom, { stroke: accentColor, width: sw * 1.6 }));
  out.push(svgText(box.x + 3, box.y + 7, "TOPIC / SUBJECT:", { fill: textColor, sizeMm: 3.4, weight: "700" }));
  out.push(
    svgText(
      (geom.isBackPage ? cueX : box.x) + 3,
      notesTop + 5.5,
      "CUES & QUESTIONS",
      { fill: accentColor, sizeMm: 2.8, weight: "700" },
    ),
  );
  out.push(
    svgText(notesBox.x + 3, notesTop + 5.5, "NOTES", {
      fill: accentColor,
      sizeMm: 2.8,
      weight: "700",
    }),
  );
  out.push(
    svgText(box.x + 3, notesBottom + 5.5, "SUMMARY", {
      fill: accentColor,
      sizeMm: 2.8,
      weight: "700",
    }),
  );

  // Rule both cue/notes and summary regions
  const notesStep = computeGridStep(notesBox.height - 7, settings.lineSpacingMm, settings.layoutMode);
  for (let i = 1; i <= notesStep.count; i++) {
    const y = notesTop + 7 + i * notesStep.stepMm;
    if (y >= notesBottom - 0.5) break;
    out.push(
      svgLine(box.x + 1, y, box.right - 1, y, {
        stroke: lineColor,
        width: sw,
        dash: geom.dashArrayAttr,
      }),
    );
  }
  const sumStep = computeGridStep(summaryH - 7, settings.lineSpacingMm, settings.layoutMode);
  for (let i = 1; i <= sumStep.count; i++) {
    const y = notesBottom + 7 + i * sumStep.stepMm;
    if (y >= box.bottom - 0.5) break;
    out.push(svgLine(box.x + 1, y, box.right - 1, y, { stroke: lineColor, width: sw, dash: geom.dashArrayAttr }));
  }

  return out.join("");
}

export function renderSeyesGrid(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const minor = Math.max(1.5, Math.min(4, settings.lineSpacingMm));
  const major = minor * 4; // standard 2mm minor -> 8mm major
  const cols = computeGridStep(box.width, major, settings.layoutMode);
  const rows = computeGridStep(box.height, minor, settings.layoutMode);
  const out: string[] = [];

  for (let c = 0; c <= cols.count; c++) {
    const x = box.x + c * cols.stepMm;
    out.push(svgLine(x, box.y, x, box.y + rows.count * rows.stepMm, { stroke: lineColor, width: sw * 1.4, opacity: 0.75 }));
  }
  for (let r = 0; r <= rows.count; r++) {
    const y = box.y + r * rows.stepMm;
    const isMajor = r % 4 === 0;
    out.push(
      svgLine(box.x, y, box.x + cols.count * cols.stepMm, y, {
        stroke: lineColor,
        width: isMajor ? sw * 1.8 : sw * 0.8,
        opacity: isMajor ? 0.95 : 0.45,
      }),
    );
  }
  if (settings.showLeftMarginRule) {
    const mx = geom.isBackPage ? box.right - 24 : box.x + 24;
    out.push(svgLine(mx, box.y, mx, box.bottom, { stroke: accentColor, width: sw * 1.7 }));
  }
  return out.join("");
}

export function renderStoryboard(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const cols = box.width > box.height ? 3 : 2;
  const rows = 3;
  const gapX = 6;
  const gapY = 6;
  const cellW = (box.width - gapX * (cols - 1)) / cols;
  const cellH = (box.height - gapY * (rows - 1)) / rows;
  const frameH = Math.min(cellW * (9 / 16), cellH * 0.62);
  const out: string[] = [];
  let scene = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = box.x + c * (cellW + gapX);
      const cy = box.y + r * (cellH + gapY);
      out.push(svgRect(cx, cy, cellW, frameH, { stroke: accentColor, strokeWidth: sw * 1.6 }));
      out.push(svgText(cx + 2, cy + 4.5, `#${scene++}`, { fill: accentColor, sizeMm: 3, weight: "700" }));
      const lineTop = cy + frameH + 2;
      const lineArea = cellH - frameH - 2;
      const lineStep = Math.max(4.5, Math.min(8, settings.lineSpacingMm * 0.8));
      const nLines = Math.max(2, Math.floor(lineArea / lineStep));
      for (let l = 1; l <= nLines; l++) {
        const ly = lineTop + l * lineStep;
        out.push(svgLine(cx, ly, cx + cellW, ly, { stroke: lineColor, width: sw }));
      }
      out.push(svgText(cx, lineTop + 2.5, "Scene / Audio:", { fill: textColor, sizeMm: 2.3, opacity: 0.7 }));
    }
  }
  return out.join("");
}

export function renderStructuredNoteSheet(
  ctx: RenderContext,
  variant:
    | "student-note"
    | "meeting-note"
    | "minimal-journal"
    | "vintage-note"
    | "branded-paper"
    | "children-drawing"
    | "sketch-paper"
    | "creative-log",
): string {
  const { settings, geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  if (variant === "minimal-journal") {
    out.push(svgText(box.x, box.y + 4, "TITLE", { fill: accentColor, sizeMm: 3.2, weight: "700" }));
    out.push(svgLine(box.x, box.y + 7, box.right, box.y + 7, { stroke: accentColor, width: sw * 1.4 }));
    return (
      out.join("") +
      renderDotGrid(ctx, {
        ...box,
        y: box.y + 11,
        height: Math.max(10, box.height - 11),
      })
    );
  }

  if (variant === "vintage-note") {
    out.push(svgRect(box.x, box.y, box.width, box.height, { stroke: accentColor, strokeWidth: sw * 1.8 }));
    out.push(svgRect(box.x + 1.8, box.y + 1.8, box.width - 3.6, box.height - 3.6, { stroke: accentColor, strokeWidth: sw * 0.8 }));
    const inner = {
      x: box.x + 5,
      y: box.y + 6,
      width: box.width - 10,
      height: box.height - 12,
      right: box.right - 5,
      bottom: box.bottom - 6,
    };
    return out.join("") + renderHorizontalLines(ctx, inner);
  }

  if (variant === "children-drawing") {
    const drawH = box.height * 0.52;
    out.push(svgRect(box.x, box.y, box.width, drawH, { stroke: accentColor, strokeWidth: sw * 1.8, rx: 3 }));
    out.push(svgText(box.x + 4, box.y + 6, "DRAW HERE", { fill: accentColor, sizeMm: 3, weight: "700", opacity: 0.65 }));
    const writeTop = box.y + drawH + 8;
    const band = Math.max(8, settings.lineSpacingMm * 1.3);
    for (let y = writeTop; y + band <= box.bottom; y += band + 4) {
      out.push(svgLine(box.x, y, box.right, y, { stroke: lineColor, width: sw * 1.2 }));
      out.push(svgLine(box.x, y + band / 2, box.right, y + band / 2, { stroke: lineColor, width: sw * 0.9, dash: 'stroke-dasharray="2 2"' }));
      out.push(svgLine(box.x, y + band, box.right, y + band, { stroke: accentColor, width: sw * 1.3 }));
    }
    return out.join("");
  }

  if (variant === "sketch-paper") {
    out.push(svgRect(box.x, box.y, box.width, box.height, { stroke: lineColor, strokeWidth: sw * 1.4 }));
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    out.push(svgLine(cx, box.y + 4, cx, box.bottom - 4, { stroke: lineColor, width: sw * 0.6, opacity: 0.35, dash: 'stroke-dasharray="2 3"' }));
    out.push(svgLine(box.x + 4, cy, box.right - 4, cy, { stroke: lineColor, width: sw * 0.6, opacity: 0.35, dash: 'stroke-dasharray="2 3"' }));
    return out.join("");
  }

  if (variant === "creative-log") {
    const splitY = box.y + box.height * 0.48;
    out.push(svgText(box.x, box.y + 4, "SKETCH / MIND MAP", { fill: accentColor, sizeMm: 2.8, weight: "700" }));
    out.push(renderDotGrid(ctx, { ...box, y: box.y + 7, height: splitY - box.y - 10, bottom: splitY - 3 }));
    out.push(svgLine(box.x, splitY, box.right, splitY, { stroke: accentColor, width: sw * 1.4 }));
    out.push(svgText(box.x, splitY + 5, "IDEAS & NOTES", { fill: accentColor, sizeMm: 2.8, weight: "700" }));
    out.push(renderHorizontalLines(ctx, { ...box, y: splitY + 8, height: box.bottom - splitY - 8 }));
    return out.join("");
  }

  if (variant === "branded-paper") {
    const headerY = box.y + 18;
    const footerY = box.bottom - 10;
    out.push(svgText(box.x, box.y + 6, "DOCUMENT TITLE", { fill: accentColor, sizeMm: 4, weight: "700" }));
    out.push(svgText(box.x, box.y + 12, "Department / Project Reference", { fill: textColor, sizeMm: 2.8, opacity: 0.7 }));
    out.push(svgLine(box.x, headerY, box.right, headerY, { stroke: accentColor, width: sw * 1.8 }));
    out.push(svgLine(box.x, footerY, box.right, footerY, { stroke: lineColor, width: sw * 1.1 }));
    out.push(svgText(box.x, box.bottom - 3, "CONFIDENTIAL / INTERNAL", { fill: textColor, sizeMm: 2.4, opacity: 0.65 }));
    out.push(
      renderHorizontalLines(ctx, {
        ...box,
        y: headerY + 3,
        height: footerY - headerY - 6,
        bottom: footerY - 3,
      }),
    );
    return out.join("");
  }

  if (variant === "student-note") {
    const headerY = box.y + 14;
    const sideW = Math.min(45, box.width * 0.26);
    const sideX = box.x + sideW;
    out.push(svgText(box.x, box.y + 5, "COURSE / TOPIC:", { fill: accentColor, sizeMm: 3.1, weight: "700" }));
    out.push(svgLine(box.x + 34, box.y + 6, box.right, box.y + 6, { stroke: lineColor, width: sw }));
    out.push(svgLine(box.x, headerY, box.right, headerY, { stroke: accentColor, width: sw * 1.5 }));
    out.push(svgLine(sideX, headerY, sideX, box.bottom, { stroke: accentColor, width: sw * 1.3 }));
    out.push(svgText(box.x + 2, headerY + 5, "KEY TERMS", { fill: accentColor, sizeMm: 2.6, weight: "700" }));
    out.push(svgText(sideX + 3, headerY + 5, "LECTURE NOTES", { fill: accentColor, sizeMm: 2.6, weight: "700" }));
    out.push(
      renderHorizontalLines(ctx, {
        ...box,
        y: headerY + 6,
        height: box.bottom - headerY - 6,
      }),
    );
    return out.join("");
  }

  // meeting-note
  const headerH = 22;
  const actionH = Math.min(54, box.height * 0.24);
  const notesTop = box.y + headerH;
  const actionTop = box.bottom - actionH;
  out.push(svgRect(box.x, box.y, box.width, headerH - 3, { stroke: accentColor, strokeWidth: sw * 1.3, rx: 2 }));
  out.push(svgText(box.x + 3, box.y + 6, "MEETING:", { fill: accentColor, sizeMm: 3, weight: "700" }));
  out.push(svgText(box.x + 3, box.y + 13, "ATTENDEES:", { fill: textColor, sizeMm: 2.8, weight: "600" }));
  out.push(svgText(box.x, notesTop + 4.5, "AGENDA & DISCUSSION", { fill: accentColor, sizeMm: 2.8, weight: "700" }));
  out.push(
    renderHorizontalLines(ctx, {
      ...box,
      y: notesTop + 6,
      height: actionTop - notesTop - 9,
      bottom: actionTop - 3,
    }),
  );
  out.push(svgLine(box.x, actionTop, box.right, actionTop, { stroke: accentColor, width: sw * 1.6 }));
  out.push(svgText(box.x, actionTop + 5, "ACTION ITEMS & OWNER", { fill: accentColor, sizeMm: 2.8, weight: "700" }));
  const step = Math.max(6, settings.lineSpacingMm);
  for (let y = actionTop + 8 + step; y <= box.bottom - 1; y += step) {
    out.push(svgRect(box.x + 1, y - 3.6, 3.2, 3.2, { stroke: accentColor, strokeWidth: sw }));
    out.push(svgLine(box.x + 7, y, box.right, y, { stroke: lineColor, width: sw }));
  }
  return out.join("");
}

export function fmtHelperCheck(): string {
  return fmt(1);
}
