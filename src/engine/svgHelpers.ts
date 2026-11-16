export function fmt(n: number): string {
  return Number.isFinite(n) ? Number(n.toFixed(3)).toString() : "0";
}

export function escXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function sanitizeImageDataUrl(url: string): string {
  const trimmed = url.trim();
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }
  return "";
}

export function sanitizeHexColor(value: string, fallback = "#111827"): string {
  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export interface LineOpts {
  stroke: string;
  width: number;
  dash?: string;
  opacity?: number;
}

export function svgLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  opts: LineOpts,
): string {
  const dashAttr = opts.dash ? ` ${opts.dash}` : "";
  const opAttr =
    opts.opacity !== undefined && opts.opacity < 1
      ? ` stroke-opacity="${fmt(opts.opacity)}"`
      : "";
  return `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}" stroke="${opts.stroke}" stroke-width="${fmt(opts.width)}"${dashAttr}${opAttr}/>`;
}

export function svgRect(
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeWidth?: number;
    dash?: string;
    rx?: number;
  },
): string {
  const fill = opts.fill ?? "none";
  const fillOp =
    opts.fillOpacity !== undefined && opts.fillOpacity < 1
      ? ` fill-opacity="${fmt(opts.fillOpacity)}"`
      : "";
  const stroke = opts.stroke ? ` stroke="${opts.stroke}"` : "";
  const sw =
    opts.strokeWidth !== undefined ? ` stroke-width="${fmt(opts.strokeWidth)}"` : "";
  const dash = opts.dash ? ` ${opts.dash}` : "";
  const rx = opts.rx !== undefined ? ` rx="${fmt(opts.rx)}"` : "";
  return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${fill}"${fillOp}${stroke}${sw}${dash}${rx}/>`;
}

export function svgCircle(
  cx: number,
  cy: number,
  r: number,
  opts: {
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeWidth?: number;
  },
): string {
  const fill = opts.fill ?? "none";
  const fillOp =
    opts.fillOpacity !== undefined && opts.fillOpacity < 1
      ? ` fill-opacity="${fmt(opts.fillOpacity)}"`
      : "";
  const stroke = opts.stroke ? ` stroke="${opts.stroke}"` : "";
  const sw =
    opts.strokeWidth !== undefined ? ` stroke-width="${fmt(opts.strokeWidth)}"` : "";
  return `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="${fill}"${fillOp}${stroke}${sw}/>`;
}

export function svgText(
  x: number,
  y: number,
  text: string,
  opts: {
    fill: string;
    sizeMm: number;
    anchor?: "start" | "middle" | "end";
    weight?: "400" | "600" | "700";
    opacity?: number;
    rotateDeg?: number;
    rotateCx?: number;
    rotateCy?: number;
    family?: string;
  },
): string {
  const anchor = opts.anchor ?? "start";
  const resolvedWeight = opts.weight === "700" || opts.weight === "600" ? "bold" : "normal";
  const family = opts.family ?? '"Atkinson Hyperlegible", Helvetica, Arial, sans-serif';
  const op =
    opts.opacity !== undefined && opts.opacity < 1
      ? ` fill-opacity="${fmt(opts.opacity)}"`
      : "";
  const transform =
    opts.rotateDeg !== undefined
      ? ` transform="rotate(${fmt(opts.rotateDeg)} ${fmt(opts.rotateCx ?? x)} ${fmt(opts.rotateCy ?? y)})"`
      : "";
  return `<text x="${fmt(x)}" y="${fmt(y)}" fill="${opts.fill}" font-family='${escXml(family)}' font-size="${fmt(opts.sizeMm)}" font-weight="${resolvedWeight}" text-anchor="${anchor}"${op}${transform}>${escXml(text)}</text>`;
}
