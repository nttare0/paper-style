import { MM_PER_INCH, MM_TO_TWIPS } from "../data/sizes";
import { DEFAULT_PAPER_SETTINGS, PAPER_TEMPLATES } from "../data/templates";
import { THEMES } from "../data/themes";
import type { PaperSettings } from "../types/paper";
import { buildSheetSvg } from "./buildSheetSvg";
import { resolvePageDimensions } from "./geometry";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildExportBaseName(settings: PaperSettings): string {
  return `paperstyle-${settings.paperType}-${settings.paperSize}`;
}

export function serializeSettingsJson(settings: PaperSettings): string {
  return JSON.stringify(settings, null, 2);
}

export function parseImportedSettingsJson(
  raw: string,
): { ok: true; settings: PaperSettings } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: "The selected file is not valid JSON. Please choose an exported PaperStyle settings JSON file.",
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      error: "Invalid settings format: expected a JSON object.",
    };
  }

  const obj = parsed as Record<string, unknown>;
  const validPaperTypes = new Set(PAPER_TEMPLATES.map((t) => t.id));
  const validThemes = new Set(THEMES.map((t) => t.id));

  const merged: PaperSettings = {
    ...DEFAULT_PAPER_SETTINGS,
    marginsMm: { ...DEFAULT_PAPER_SETTINGS.marginsMm },
  };

  if (obj.printerType === "color" || obj.printerType === "bw") {
    merged.printerType = obj.printerType;
  }
  if (typeof obj.paperType === "string" && validPaperTypes.has(obj.paperType as PaperSettings["paperType"])) {
    merged.paperType = obj.paperType as PaperSettings["paperType"];
  }
  if (obj.units === "mm" || obj.units === "in") {
    merged.units = obj.units;
  }
  if (
    typeof obj.paperSize === "string" &&
    ["a4", "a5", "a3", "b4", "b5", "letter", "legal", "tabloid", "executive", "custom"].includes(obj.paperSize)
  ) {
    merged.paperSize = obj.paperSize as PaperSettings["paperSize"];
  }
  if (obj.orientation === "portrait" || obj.orientation === "landscape") {
    merged.orientation = obj.orientation;
  }
  if (typeof obj.customWidthMm === "number" && Number.isFinite(obj.customWidthMm)) {
    merged.customWidthMm = obj.customWidthMm;
  }
  if (typeof obj.customHeightMm === "number" && Number.isFinite(obj.customHeightMm)) {
    merged.customHeightMm = obj.customHeightMm;
  }
  if (typeof obj.theme === "string" && validThemes.has(obj.theme as PaperSettings["theme"])) {
    merged.theme = obj.theme as PaperSettings["theme"];
  }
  if (typeof obj.lineColor === "string") merged.lineColor = obj.lineColor;
  if (typeof obj.accentColor === "string") merged.accentColor = obj.accentColor;
  if (obj.lineStyle === "solid" || obj.lineStyle === "dashed" || obj.lineStyle === "dotted") {
    merged.lineStyle = obj.lineStyle;
  }
  if (typeof obj.lineSpacingMm === "number" && Number.isFinite(obj.lineSpacingMm)) {
    merged.lineSpacingMm = obj.lineSpacingMm;
  }
  if (typeof obj.lineWidthPx === "number" && Number.isFinite(obj.lineWidthPx)) {
    merged.lineWidthPx = obj.lineWidthPx;
  }
  if (obj.layoutMode === "fill" || obj.layoutMode === "fixed") {
    merged.layoutMode = obj.layoutMode;
  }
  if (typeof obj.linkMargins === "boolean") merged.linkMargins = obj.linkMargins;
  if (typeof obj.marginsMm === "object" && obj.marginsMm !== null) {
    const m = obj.marginsMm as Record<string, unknown>;
    if (typeof m.top === "number" && Number.isFinite(m.top)) merged.marginsMm.top = m.top;
    if (typeof m.right === "number" && Number.isFinite(m.right)) merged.marginsMm.right = m.right;
    if (typeof m.bottom === "number" && Number.isFinite(m.bottom)) merged.marginsMm.bottom = m.bottom;
    if (typeof m.left === "number" && Number.isFinite(m.left)) merged.marginsMm.left = m.left;
  }
  if (typeof obj.showDateLine === "boolean") merged.showDateLine = obj.showDateLine;
  if (typeof obj.dateFontSizeMm === "number" && Number.isFinite(obj.dateFontSizeMm)) {
    merged.dateFontSizeMm = obj.dateFontSizeMm;
  }
  if (typeof obj.showLeftMarginRule === "boolean") {
    merged.showLeftMarginRule = obj.showLeftMarginRule;
  }
  if (typeof obj.slantAngleDeg === "number" && Number.isFinite(obj.slantAngleDeg)) {
    merged.slantAngleDeg = obj.slantAngleDeg;
  }
  if (
    typeof obj.holePunch === "string" &&
    ["none", "3-hole", "2-hole", "4-hole", "5-hole", "top-2-hole", "single-ring"].includes(obj.holePunch)
  ) {
    merged.holePunch = obj.holePunch as PaperSettings["holePunch"];
  }
  if (typeof obj.sidebarEnabled === "boolean") merged.sidebarEnabled = obj.sidebarEnabled;
  if (typeof obj.sidebarWidthMm === "number" && Number.isFinite(obj.sidebarWidthMm)) {
    merged.sidebarWidthMm = obj.sidebarWidthMm;
  }
  if (obj.sidebarPosition === "left" || obj.sidebarPosition === "right") {
    merged.sidebarPosition = obj.sidebarPosition;
  }
  if (typeof obj.backgroundColor === "string") merged.backgroundColor = obj.backgroundColor;
  if (typeof obj.backgroundPattern === "string") {
    merged.backgroundPattern = obj.backgroundPattern as PaperSettings["backgroundPattern"];
  }
  if (typeof obj.patternOpacity === "number" && Number.isFinite(obj.patternOpacity)) {
    merged.patternOpacity = obj.patternOpacity;
  }
  if (typeof obj.customBgImageDataUrl === "string") {
    merged.customBgImageDataUrl = obj.customBgImageDataUrl;
  }
  if (typeof obj.watermarkEnabled === "boolean") merged.watermarkEnabled = obj.watermarkEnabled;
  if (typeof obj.watermarkText === "string") merged.watermarkText = obj.watermarkText;
  if (typeof obj.watermarkOpacity === "number" && Number.isFinite(obj.watermarkOpacity)) {
    merged.watermarkOpacity = obj.watermarkOpacity;
  }
  if (typeof obj.watermarkSizeMm === "number" && Number.isFinite(obj.watermarkSizeMm)) {
    merged.watermarkSizeMm = obj.watermarkSizeMm;
  }
  if (typeof obj.watermarkAngleDeg === "number" && Number.isFinite(obj.watermarkAngleDeg)) {
    merged.watermarkAngleDeg = obj.watermarkAngleDeg;
  }
  if (typeof obj.logoEnabled === "boolean") merged.logoEnabled = obj.logoEnabled;
  if (typeof obj.logoDataUrl === "string") merged.logoDataUrl = obj.logoDataUrl;
  if (
    typeof obj.logoPosition === "string" &&
    ["top-left", "top-right", "bottom-left", "bottom-right"].includes(obj.logoPosition)
  ) {
    merged.logoPosition = obj.logoPosition as PaperSettings["logoPosition"];
  }
  if (typeof obj.logoSizeMm === "number" && Number.isFinite(obj.logoSizeMm)) {
    merged.logoSizeMm = obj.logoSizeMm;
  }
  if (typeof obj.pageCount === "number" && Number.isInteger(obj.pageCount)) {
    merged.pageCount = Math.max(1, Math.min(100, obj.pageCount));
  }
  if (typeof obj.showPageNumber === "boolean") merged.showPageNumber = obj.showPageNumber;
  if (typeof obj.doubleSided === "boolean") merged.doubleSided = obj.doubleSided;
  if (typeof obj.inkColor === "string") merged.inkColor = obj.inkColor;
  if (typeof obj.inkFontScale === "number" && Number.isFinite(obj.inkFontScale)) {
    merged.inkFontScale = Math.max(0.75, Math.min(1.4, obj.inkFontScale));
  }
  if (typeof obj.pageNotes === "object" && obj.pageNotes !== null && !Array.isArray(obj.pageNotes)) {
    const notes: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj.pageNotes as Record<string, unknown>)) {
      if (/^\d+$/.test(k) && typeof v === "string") {
        notes[k] = v;
      }
    }
    merged.pageNotes = notes;
  }

  return { ok: true, settings: merged };
}

export function exportSettingsFile(settings: PaperSettings): void {
  const json = serializeSettingsJson(settings);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, `${buildExportBaseName(settings)}-settings.json`);
}

export function exportSvgFile(settings: PaperSettings, pageNumber = 1): void {
  const { svg } = buildSheetSvg(settings, pageNumber);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, `${buildExportBaseName(settings)}-p${pageNumber}.svg`);
}

export async function rasterizeSvgToPng(
  svgString: string,
  widthMm: number,
  heightMm: number,
  dpi = 220,
): Promise<{ blob: Blob; buffer: Uint8Array; pixelWidth: number; pixelHeight: number }> {
  const pxWidth = Math.min(4200, Math.max(300, Math.round((widthMm / MM_PER_INCH) * dpi)));
  const pxHeight = Math.min(4200, Math.max(300, Math.round((heightMm / MM_PER_INCH) * dpi)));

  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not rasterize SVG into an image."));
      el.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = pxWidth;
    canvas.height = pxHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2D canvas context is unavailable in this browser.");
    }
    ctx.drawImage(img, 0, 0, pxWidth, pxHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((out) => {
        if (out) resolve(out);
        else reject(new Error("Failed to encode PNG image."));
      }, "image/png");
    });
    const arrayBuf = await blob.arrayBuffer();
    return {
      blob,
      buffer: new Uint8Array(arrayBuf),
      pixelWidth: pxWidth,
      pixelHeight: pxHeight,
    };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function exportPngFile(
  settings: PaperSettings,
  pageNumber = 1,
): Promise<void> {
  const { svg, geometry } = buildSheetSvg(settings, pageNumber);
  const { blob } = await rasterizeSvgToPng(svg, geometry.widthMm, geometry.heightMm, 300);
  downloadBlob(blob, `${buildExportBaseName(settings)}-p${pageNumber}.png`);
}

export async function createPdfDocumentBytes(
  settings: PaperSettings,
): Promise<ArrayBuffer> {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([
    import("jspdf"),
    import("svg2pdf.js"),
  ]);
  const { widthMm, heightMm } = resolvePageDimensions(settings);
  const orientation = widthMm > heightMm ? "landscape" : "portrait";
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: [widthMm, heightMm],
    compress: true,
  });

  const parser = new DOMParser();
  const totalPages = Math.max(1, Math.min(100, Math.round(settings.pageCount)));

  for (let p = 1; p <= totalPages; p++) {
    if (p > 1) {
      doc.addPage([widthMm, heightMm], orientation);
    }
    const { svg } = buildSheetSvg(settings, p);
    const parsed = parser.parseFromString(svg, "image/svg+xml");
    const svgElement = parsed.documentElement as unknown as SVGSVGElement;

    try {
      await svg2pdf(svgElement, doc, {
        x: 0,
        y: 0,
        width: widthMm,
        height: heightMm,
      });
    } catch {
      const { buffer } = await rasterizeSvgToPng(svg, widthMm, heightMm, 220);
      doc.addImage(buffer, "PNG", 0, 0, widthMm, heightMm);
    }
  }

  return doc.output("arraybuffer");
}

export async function exportPdfFile(settings: PaperSettings): Promise<void> {
  const buf = await createPdfDocumentBytes(settings);
  const blob = new Blob([buf], { type: "application/pdf" });
  downloadBlob(blob, `${buildExportBaseName(settings)}.pdf`);
}

export async function createDocxDocumentBlob(
  settings: PaperSettings,
): Promise<Blob> {
  const { Document, ImageRun, Packer, PageOrientation, Paragraph } = await import("docx");
  const { widthMm, heightMm } = resolvePageDimensions(settings);
  const totalPages = Math.max(1, Math.min(100, Math.round(settings.pageCount)));
  const pageWidthPx = Math.round((widthMm / MM_PER_INCH) * 96);
  const pageHeightPx = Math.round((heightMm / MM_PER_INCH) * 96);

  // Cache rendered PNGs for identical pages when page numbers aren't drawn
  const frontSheet = buildSheetSvg(settings, 1);
  const frontPng = await rasterizeSvgToPng(frontSheet.svg, widthMm, heightMm, 200);
  let backPng: Awaited<ReturnType<typeof rasterizeSvgToPng>> | null = null;
  if (settings.doubleSided && !settings.showPageNumber && totalPages > 1) {
    const backSheet = buildSheetSvg(settings, 2);
    backPng = await rasterizeSvgToPng(backSheet.svg, widthMm, heightMm, 200);
  }

  const sections = [];
  for (let p = 1; p <= totalPages; p++) {
    let pngData: Uint8Array;
    if (settings.showPageNumber) {
      const sheet = buildSheetSvg(settings, p);
      const rendered = await rasterizeSvgToPng(sheet.svg, widthMm, heightMm, 200);
      pngData = rendered.buffer;
    } else if (settings.doubleSided && p % 2 === 0 && backPng) {
      pngData = backPng.buffer;
    } else {
      pngData = frontPng.buffer;
    }

    sections.push({
      properties: {
        page: {
          size: {
            width: Math.round(widthMm * MM_TO_TWIPS),
            height: Math.round(heightMm * MM_TO_TWIPS),
            orientation:
              widthMm > heightMm
                ? PageOrientation.LANDSCAPE
                : PageOrientation.PORTRAIT,
          },
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              type: "png",
              data: pngData,
              transformation: {
                width: pageWidthPx,
                height: pageHeightPx,
              },
            }),
          ],
        }),
      ],
    });
  }

  const doc = new Document({ sections });
  return Packer.toBlob(doc);
}

export async function exportDocxFile(settings: PaperSettings): Promise<void> {
  const blob = await createDocxDocumentBlob(settings);
  downloadBlob(blob, `${buildExportBaseName(settings)}.docx`);
}
