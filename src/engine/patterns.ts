import type { BackgroundPatternId } from "../types/paper";
import { fmt, sanitizeImageDataUrl, svgCircle, svgLine, svgRect } from "./svgHelpers";

export interface PatternOption {
  id: BackgroundPatternId;
  label: string;
}

export const BACKGROUND_PATTERNS: PatternOption[] = [
  { id: "none", label: "No Pattern" },
  { id: "grid", label: "Grid Pattern" },
  { id: "dots", label: "Dots Pattern" },
  { id: "lines", label: "Lines Pattern" },
  { id: "crosshatch", label: "Crosshatch Pattern" },
  { id: "graph", label: "Graph Pattern" },
  { id: "vertical-stripes", label: "Vertical Stripes" },
  { id: "diagonal-slash", label: "Diagonal Stripes (/)" },
  { id: "diagonal-backslash", label: "Diagonal Stripes (\\)" },
  { id: "dense-dots", label: "Dense Dots" },
  { id: "checkerboard", label: "Checkerboard" },
  { id: "solid-shade", label: "Solid Shade" },
  { id: "custom-image", label: "Custom Image" },
];

/**
 * Renders background pattern using explicit vector primitives clipped to the sheet,
 * ensuring 100% consistent rendering across browser SVG, PNG canvas, and vector PDF.
 */
export function renderBackgroundPattern(
  pattern: BackgroundPatternId,
  widthMm: number,
  heightMm: number,
  tintColor: string,
  opacity: number,
  customImageDataUrl: string,
): string {
  if (pattern === "none") return "";
  const op = Math.max(0.03, Math.min(0.95, opacity));

  if (pattern === "custom-image") {
    const safeUrl = sanitizeImageDataUrl(customImageDataUrl);
    if (!safeUrl) return "";
    return `<image href="${safeUrl}" x="0" y="0" width="${fmt(widthMm)}" height="${fmt(heightMm)}" preserveAspectRatio="xMidYMid slice" opacity="${fmt(op)}"/>`;
  }

  if (pattern === "solid-shade") {
    return svgRect(0, 0, widthMm, heightMm, {
      fill: tintColor,
      fillOpacity: op * 0.65,
    });
  }

  const out: string[] = [];

  if (pattern === "grid" || pattern === "graph") {
    const step = pattern === "graph" ? 5 : 10;
    const sw = pattern === "graph" ? 0.14 : 0.2;
    for (let x = step; x < widthMm; x += step) {
      const major = pattern === "graph" && Math.round(x / step) % 5 === 0;
      out.push(
        svgLine(x, 0, x, heightMm, {
          stroke: tintColor,
          width: major ? sw * 1.8 : sw,
          opacity: major ? op * 1.4 : op,
        }),
      );
    }
    for (let y = step; y < heightMm; y += step) {
      const major = pattern === "graph" && Math.round(y / step) % 5 === 0;
      out.push(
        svgLine(0, y, widthMm, y, {
          stroke: tintColor,
          width: major ? sw * 1.8 : sw,
          opacity: major ? op * 1.4 : op,
        }),
      );
    }
    return `<g>${out.join("")}</g>`;
  }

  if (pattern === "dots" || pattern === "dense-dots") {
    const step = pattern === "dense-dots" ? 4 : 8;
    const r = pattern === "dense-dots" ? 0.35 : 0.45;
    for (let y = step / 2; y < heightMm; y += step) {
      for (let x = step / 2; x < widthMm; x += step) {
        out.push(svgCircle(x, y, r, { fill: tintColor, fillOpacity: op }));
      }
    }
    return `<g>${out.join("")}</g>`;
  }

  if (pattern === "lines") {
    const step = 8;
    for (let y = step; y < heightMm; y += step) {
      out.push(svgLine(0, y, widthMm, y, { stroke: tintColor, width: 0.2, opacity: op }));
    }
    return `<g>${out.join("")}</g>`;
  }

  if (pattern === "vertical-stripes") {
    const step = 8;
    for (let x = step; x < widthMm; x += step) {
      out.push(svgLine(x, 0, x, heightMm, { stroke: tintColor, width: 0.2, opacity: op }));
    }
    return `<g>${out.join("")}</g>`;
  }

  if (
    pattern === "diagonal-slash" ||
    pattern === "diagonal-backslash" ||
    pattern === "crosshatch"
  ) {
    const step = 8;
    const maxSpan = widthMm + heightMm;
    if (pattern === "diagonal-slash" || pattern === "crosshatch") {
      for (let d = 0; d < maxSpan; d += step) {
        const x1 = Math.max(0, d - heightMm);
        const y1 = Math.min(heightMm, d);
        const x2 = Math.min(widthMm, d);
        const y2 = Math.max(0, d - widthMm);
        out.push(svgLine(x1, y1, x2, y2, { stroke: tintColor, width: 0.18, opacity: op }));
      }
    }
    if (pattern === "diagonal-backslash" || pattern === "crosshatch") {
      for (let d = -heightMm; d < widthMm; d += step) {
        const x1 = Math.max(0, d);
        const y1 = Math.max(0, -d);
        const x2 = Math.min(widthMm, d + heightMm);
        const y2 = Math.min(heightMm, widthMm - d);
        out.push(svgLine(x1, y1, x2, y2, { stroke: tintColor, width: 0.18, opacity: op }));
      }
    }
    return `<g>${out.join("")}</g>`;
  }

  if (pattern === "checkerboard") {
    const size = 10;
    const cols = Math.ceil(widthMm / size);
    const rows = Math.ceil(heightMm / size);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0) {
          const x = c * size;
          const y = r * size;
          const w = Math.min(size, widthMm - x);
          const h = Math.min(size, heightMm - y);
          out.push(svgRect(x, y, w, h, { fill: tintColor, fillOpacity: op * 0.45 }));
        }
      }
    }
    return `<g>${out.join("")}</g>`;
  }

  return "";
}
