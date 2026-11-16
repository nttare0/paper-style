import { computeGridStep } from "../geometry";
import { fmt, svgCircle, svgLine, svgRect, svgText } from "../svgHelpers";
import { renderGrid } from "./basicLinesGrids";
import type { RenderContext } from "./types";

function clipGroup(boxId: string, box: RenderContext["geom"]["contentBox"], inner: string): string {
  return `<defs><clipPath id="${boxId}"><rect x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.width)}" height="${fmt(box.height)}"/></clipPath></defs><g clip-path="url(#${boxId})">${inner}</g>`;
}

export function renderIsometricGrid(ctx: RenderContext): string {
  const { settings, geom, lineColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const step = Math.max(3, settings.lineSpacingMm);
  const dx = (step * Math.sqrt(3)) / 2;
  const dy = step / 2;
  const tan30 = Math.tan(Math.PI / 6);
  const out: string[] = [];

  // Vertical lines
  for (let x = box.x; x <= box.right + 0.01; x += dx) {
    out.push(svgLine(x, box.y, x, box.bottom, { stroke: lineColor, width: sw }));
  }

  // +30 deg and -30 deg diagonals across clipped content box
  const maxOffset = box.width * tan30 + box.height;
  for (let y0 = box.y - box.width * tan30; y0 <= box.bottom + maxOffset; y0 += step) {
    out.push(
      svgLine(box.x, y0, box.right, y0 + box.width * tan30, {
        stroke: lineColor,
        width: sw,
      }),
    );
    out.push(
      svgLine(box.x, y0 + box.width * tan30, box.right, y0, {
        stroke: lineColor,
        width: sw,
      }),
    );
  }
  void dy;
  return clipGroup("iso-clip", box, out.join(""));
}

export function renderIsometricDot(ctx: RenderContext): string {
  const { settings, geom, lineColor } = ctx;
  const box = geom.contentBox;
  const step = Math.max(3, settings.lineSpacingMm);
  const dx = (step * Math.sqrt(3)) / 2;
  const dy = step / 2;
  const rDot = Math.max(0.24, geom.strokeWidthMm * 1.5);
  const out: string[] = [];

  let col = 0;
  for (let x = box.x; x <= box.right + 0.01; x += dx) {
    const startY = box.y + (col % 2 === 1 ? dy : 0);
    for (let y = startY; y <= box.bottom + 0.01; y += step) {
      out.push(svgCircle(x, y, rDot, { fill: lineColor }));
    }
    col++;
  }
  return out.join("");
}

export function renderPerspectiveGrid(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const horizonY = box.y + box.height * 0.45;
  const vpLeftX = box.x + box.width * 0.06;
  const vpRightX = box.right - box.width * 0.06;
  const rays = Math.max(8, Math.round(60 / Math.max(3, settings.lineSpacingMm)));
  const out: string[] = [];

  // Horizon
  out.push(svgLine(box.x, horizonY, box.right, horizonY, { stroke: accentColor, width: sw * 1.6 }));

  // Vertical reference lines
  const vStep = computeGridStep(box.width, Math.max(10, settings.lineSpacingMm * 2.5), settings.layoutMode);
  for (let i = 0; i <= vStep.count; i++) {
    const x = box.x + i * vStep.stepMm;
    out.push(svgLine(x, box.y, x, box.bottom, { stroke: lineColor, width: sw * 0.7, opacity: 0.45 }));
  }

  // Two-point vanishing rays
  for (let i = -rays; i <= rays; i++) {
    if (i === 0) continue;
    const angle = (i / rays) * (Math.PI * 0.36);
    const len = box.width * 1.4;
    out.push(
      svgLine(vpLeftX, horizonY, vpLeftX + Math.cos(angle) * len, horizonY + Math.sin(angle) * len, {
        stroke: lineColor,
        width: sw,
        opacity: 0.75,
      }),
    );
    out.push(
      svgLine(vpRightX, horizonY, vpRightX - Math.cos(angle) * len, horizonY + Math.sin(angle) * len, {
        stroke: lineColor,
        width: sw,
        opacity: 0.75,
      }),
    );
  }
  out.push(svgCircle(vpLeftX, horizonY, 1.2, { fill: accentColor }));
  out.push(svgCircle(vpRightX, horizonY, 1.2, { fill: accentColor }));
  return clipGroup("persp-clip", box, out.join(""));
}

export function renderHexagonalGrid(ctx: RenderContext): string {
  const { settings, geom, lineColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const r = Math.max(4, settings.lineSpacingMm / 2);
  const w = Math.sqrt(3) * r;
  const hStep = 1.5 * r;
  const out: string[] = [];

  const hexPath = (cx: number, cy: number): string => {
    const pts: string[] = [];
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 180) * (60 * k - 30);
      pts.push(`${fmt(cx + r * Math.cos(a))},${fmt(cy + r * Math.sin(a))}`);
    }
    return `<polygon points="${pts.join(" ")}" fill="none" stroke="${lineColor}" stroke-width="${fmt(sw)}"/>`;
  };

  let row = 0;
  for (let cy = box.y + r; cy <= box.bottom + r; cy += hStep) {
    const offset = row % 2 === 1 ? w / 2 : 0;
    for (let cx = box.x + w / 2 + offset; cx <= box.right + w; cx += w) {
      out.push(hexPath(cx, cy));
    }
    row++;
  }
  return clipGroup("hex-clip", box, out.join(""));
}

export function renderPolarGrid(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const maxR = Math.min(box.width, box.height) / 2 - 4;
  const step = Math.max(4, settings.lineSpacingMm);
  const rings = Math.max(2, Math.floor(maxR / step));
  const out: string[] = [];

  for (let i = 1; i <= rings; i++) {
    const r = i * step;
    const major = i % 5 === 0;
    out.push(
      svgCircle(cx, cy, r, {
        stroke: major ? accentColor : lineColor,
        strokeWidth: major ? sw * 1.5 : sw,
      }),
    );
  }
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const major = deg % 45 === 0;
    out.push(
      svgLine(cx, cy, cx + rings * step * Math.cos(rad), cy + rings * step * Math.sin(rad), {
        stroke: major ? accentColor : lineColor,
        width: major ? sw * 1.4 : sw * 0.85,
        opacity: major ? 0.9 : 0.65,
      }),
    );
  }
  return out.join("");
}

export function renderNumberLine(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const stepY = Math.max(16, settings.lineSpacingMm);
  const rows = Math.max(2, Math.floor(box.height / stepY));
  const out: string[] = [];

  for (let r = 0; r < rows; r++) {
    const y = box.y + (r + 0.55) * (box.height / rows);
    out.push(svgLine(box.x + 3, y, box.right - 3, y, { stroke: accentColor, width: sw * 1.6 }));
    // Arrows
    out.push(`<polyline points="${fmt(box.x + 6)},${fmt(y - 2)} ${fmt(box.x + 2.5)},${fmt(y)} ${fmt(box.x + 6)},${fmt(y + 2)}" fill="none" stroke="${accentColor}" stroke-width="${fmt(sw * 1.4)}"/>`);
    out.push(`<polyline points="${fmt(box.right - 6)},${fmt(y - 2)} ${fmt(box.right - 2.5)},${fmt(y)} ${fmt(box.right - 6)},${fmt(y + 2)}" fill="none" stroke="${accentColor}" stroke-width="${fmt(sw * 1.4)}"/>`);
    const ticks = 20;
    const span = box.width - 18;
    for (let t = 0; t <= ticks; t++) {
      const tx = box.x + 9 + (t / ticks) * span;
      const major = t % 5 === 0;
      out.push(
        svgLine(tx, y - (major ? 3.2 : 1.8), tx, y + (major ? 3.2 : 1.8), {
          stroke: major ? accentColor : lineColor,
          width: major ? sw * 1.3 : sw,
        }),
      );
      if (major) {
        out.push(svgText(tx, y + 6.5, String(t - 10), { fill: textColor, sizeMm: 2.5, anchor: "middle" }));
      }
    }
  }
  return out.join("");
}

export function renderLogGraph(
  ctx: RenderContext,
  mode: "semi-log" | "log-log",
): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];
  const yDecades = 3;
  const decadeH = box.height / yDecades;

  out.push(svgRect(box.x, box.y, box.width, box.height, { stroke: accentColor, strokeWidth: sw * 1.6 }));

  // Vertical decades (log10 subdivisions 1..9)
  for (let d = 0; d < yDecades; d++) {
    const baseY = box.bottom - d * decadeH;
    for (let n = 1; n <= 9; n++) {
      const ly = baseY - Math.log10(n) * decadeH;
      const isMajor = n === 1;
      out.push(
        svgLine(box.x, ly, box.right, ly, {
          stroke: isMajor ? accentColor : lineColor,
          width: isMajor ? sw * 1.5 : sw * 0.85,
        }),
      );
    }
  }

  if (mode === "semi-log") {
    const cols = computeGridStep(box.width, Math.max(3, settings.lineSpacingMm), settings.layoutMode);
    for (let c = 1; c < cols.count; c++) {
      const x = box.x + c * cols.stepMm;
      const major = c % 5 === 0;
      out.push(svgLine(x, box.y, x, box.bottom, { stroke: major ? accentColor : lineColor, width: major ? sw * 1.3 : sw * 0.8 }));
    }
  } else {
    const xDecades = 2;
    const decadeW = box.width / xDecades;
    for (let d = 0; d < xDecades; d++) {
      const baseX = box.x + d * decadeW;
      for (let n = 1; n <= 9; n++) {
        const lx = baseX + Math.log10(n) * decadeW;
        const isMajor = n === 1;
        out.push(
          svgLine(lx, box.y, lx, box.bottom, {
            stroke: isMajor ? accentColor : lineColor,
            width: isMajor ? sw * 1.5 : sw * 0.85,
          }),
        );
      }
    }
  }
  return out.join("");
}

export function renderArithmeticPaper(ctx: RenderContext): string {
  const { geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const headerH = 12;
  const out: string[] = [];
  out.push(svgText(box.x, box.y + 5, "NAME:", { fill: accentColor, sizeMm: 3, weight: "700" }));
  out.push(svgLine(box.x + 14, box.y + 5.5, box.x + box.width * 0.55, box.y + 5.5, { stroke: lineColor, width: sw }));
  out.push(svgText(box.x + box.width * 0.6, box.y + 5, "SCORE:", { fill: accentColor, sizeMm: 3, weight: "700" }));
  out.push(svgLine(box.x + box.width * 0.74, box.y + 5.5, box.right, box.y + 5.5, { stroke: lineColor, width: sw }));
  out.push(svgLine(box.x, box.y + headerH - 2, box.right, box.y + headerH - 2, { stroke: accentColor, width: sw * 1.4 }));
  void textColor;
  return (
    out.join("") +
    renderGrid(
      ctx,
      {
        ...box,
        y: box.y + headerH,
        height: box.height - headerH,
      },
      undefined,
      5,
    )
  );
}

export function renderTenFrames(ctx: RenderContext): string {
  const { geom, accentColor, lineColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  // Top half: 6 Ten Frames (2 cols x 3 rows)
  const tfTop = box.y + 6;
  const tfH = box.height * 0.38;
  out.push(svgText(box.x, box.y + 4, "TEN FRAMES (2 × 5)", { fill: accentColor, sizeMm: 3, weight: "700" }));
  const cols = 2;
  const rows = 3;
  const gap = 8;
  const frameW = Math.min((box.width - gap) / cols, 75);
  const cellS = Math.min(frameW / 5, (tfH - gap * 2) / (rows * 2));
  const actualW = cellS * 5;
  const actualH = cellS * 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fx = box.x + c * (actualW + gap);
      const fy = tfTop + r * (actualH + 6);
      out.push(svgRect(fx, fy, actualW, actualH, { stroke: accentColor, strokeWidth: sw * 1.5 }));
      for (let i = 1; i < 5; i++) {
        out.push(svgLine(fx + i * cellS, fy, fx + i * cellS, fy + actualH, { stroke: lineColor, width: sw }));
      }
      out.push(svgLine(fx, fy + cellS, fx + actualW, fy + cellS, { stroke: lineColor, width: sw }));
    }
  }

  // Bottom half: 1–100 Hundreds Chart
  const hcTop = box.y + box.height * 0.48;
  out.push(svgText(box.x, hcTop - 2.5, "1–100 HUNDREDS CHART", { fill: accentColor, sizeMm: 3, weight: "700" }));
  const chartSize = Math.min(box.width, box.bottom - hcTop);
  const hcCell = chartSize / 10;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const x = box.x + c * hcCell;
      const y = hcTop + r * hcCell;
      out.push(svgRect(x, y, hcCell, hcCell, { stroke: lineColor, strokeWidth: sw }));
      const num = r * 10 + c + 1;
      out.push(
        svgText(x + hcCell / 2, y + hcCell * 0.64, String(num), {
          fill: textColor,
          sizeMm: Math.max(2.4, hcCell * 0.36),
          anchor: "middle",
        }),
      );
    }
  }
  return out.join("");
}

export function renderBlankClockFaces(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const approxCell = Math.max(28, settings.lineSpacingMm);
  const cols = Math.max(2, Math.floor(box.width / approxCell));
  const rows = Math.max(2, Math.floor(box.height / approxCell));
  const cellW = box.width / cols;
  const cellH = box.height / rows;
  const radius = Math.min(cellW, cellH) * 0.38;
  const out: string[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = box.x + (c + 0.5) * cellW;
      const cy = box.y + (r + 0.47) * cellH;
      out.push(svgCircle(cx, cy, radius, { stroke: accentColor, strokeWidth: sw * 1.5 }));
      out.push(svgCircle(cx, cy, 0.8, { fill: accentColor }));
      for (let h = 1; h <= 12; h++) {
        const ang = ((h * 30 - 90) * Math.PI) / 180;
        const r1 = radius * 0.86;
        const r2 = radius * 0.98;
        out.push(
          svgLine(
            cx + r1 * Math.cos(ang),
            cy + r1 * Math.sin(ang),
            cx + r2 * Math.cos(ang),
            cy + r2 * Math.sin(ang),
            { stroke: lineColor, width: sw * 1.2 },
          ),
        );
        const rt = radius * 0.7;
        out.push(
          svgText(cx + rt * Math.cos(ang), cy + rt * Math.sin(ang) + 0.9, String(h), {
            fill: textColor,
            sizeMm: Math.max(2.1, radius * 0.17),
            anchor: "middle",
          }),
        );
      }
      // Time write-in line below each clock
      out.push(
        svgLine(cx - radius * 0.55, cy + radius + 4.5, cx + radius * 0.55, cy + radius + 4.5, {
          stroke: lineColor,
          width: sw,
        }),
      );
    }
  }
  return out.join("");
}

export function renderFractionBars(ctx: RenderContext): string {
  const { geom, accentColor, lineColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const denominators = [1, 2, 3, 4, 5, 6, 8, 10, 12];
  const gap = 3.5;
  const barH = Math.min(20, (box.height - 10 - gap * (denominators.length - 1)) / denominators.length);
  const out: string[] = [];

  out.push(svgText(box.x, box.y + 4, "FRACTION WALL", { fill: accentColor, sizeMm: 3.4, weight: "700" }));

  denominators.forEach((den, idx) => {
    const y = box.y + 8 + idx * (barH + gap);
    const segW = box.width / den;
    for (let s = 0; s < den; s++) {
      const x = box.x + s * segW;
      out.push(
        svgRect(x, y, segW, barH, {
          stroke: accentColor,
          strokeWidth: sw * 1.3,
          fill: idx % 2 === 0 ? lineColor : undefined,
          fillOpacity: idx % 2 === 0 ? 0.08 : undefined,
        }),
      );
      const label = den === 1 ? "1" : `1/${den}`;
      out.push(
        svgText(x + segW / 2, y + barH * 0.62, label, {
          fill: textColor,
          sizeMm: Math.min(3.4, segW * 0.34, barH * 0.45),
          anchor: "middle",
          weight: "600",
        }),
      );
    }
  });
  return out.join("");
}

export function renderKnittingGraph(ctx: RenderContext): string {
  const { geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const cols = 20;
  const rows = 50;
  // Standard knitting stitch ratio is wider than tall (~4:3 or taller-than-wide per template spec)
  const labelMargin = 8;
  const gridW = box.width - labelMargin * 2;
  const gridH = box.height - labelMargin * 2;
  const cellW = Math.min(gridW / cols, (gridH / rows) * 1.35);
  const cellH = Math.min(gridH / rows, cellW * 0.78);
  const totalW = cellW * cols;
  const totalH = cellH * rows;
  const gx = box.x + (box.width - totalW) / 2;
  const gy = box.y + (box.height - totalH) / 2;
  const out: string[] = [];

  for (let c = 0; c <= cols; c++) {
    const x = gx + c * cellW;
    const major = c % 10 === 0;
    out.push(svgLine(x, gy, x, gy + totalH, { stroke: major ? accentColor : lineColor, width: major ? sw * 1.8 : sw }));
  }
  for (let r = 0; r <= rows; r++) {
    const y = gy + r * cellH;
    const major = r % 10 === 0;
    out.push(svgLine(gx, y, gx + totalW, y, { stroke: major ? accentColor : lineColor, width: major ? sw * 1.8 : sw }));
  }
  // Column numbers right-to-left (1, 10, 20)
  [1, 5, 10, 15, 20].forEach((colNum) => {
    const x = gx + (cols - colNum + 0.5) * cellW;
    out.push(svgText(x, gy + totalH + 4, String(colNum), { fill: textColor, sizeMm: 2.3, anchor: "middle" }));
  });
  // Row numbers bottom-to-top (1..50 every 5)
  for (let rowNum = 1; rowNum <= rows; rowNum++) {
    if (rowNum === 1 || rowNum % 5 === 0) {
      const y = gy + (rows - rowNum + 0.72) * cellH;
      out.push(svgText(gx + totalW + 2, y, String(rowNum), { fill: textColor, sizeMm: 2.2 }));
    }
  }
  return out.join("");
}
