import { describe, expect, it } from "vitest";
import { DEFAULT_PAPER_SETTINGS } from "../src/data/templates";
import { buildSheetSvg } from "../src/engine/buildSheetSvg";
import {
  createPdfDocumentBytes,
  parseImportedSettingsJson,
  serializeSettingsJson,
} from "../src/engine/exporters";

describe("Settings persistence & document exporters", () => {
  it("roundtrips exported settings JSON cleanly", () => {
    const custom = {
      ...DEFAULT_PAPER_SETTINGS,
      paperType: "cornell-notes" as const,
      paperSize: "letter" as const,
      units: "in" as const,
      holePunch: "3-hole" as const,
      doubleSided: true,
      pageCount: 5,
    };

    const json = serializeSettingsJson(custom);
    const parsed = parseImportedSettingsJson(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.settings.paperType).toBe("cornell-notes");
      expect(parsed.settings.paperSize).toBe("letter");
      expect(parsed.settings.holePunch).toBe("3-hole");
      expect(parsed.settings.doubleSided).toBe(true);
      expect(parsed.settings.pageCount).toBe(5);
    }
  });

  it("rejects invalid settings JSON with a helpful error", () => {
    const bad = parseImportedSettingsJson("{not valid json");
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error).toContain("not valid JSON");
    }
  });

  it("strips unsafe image data URLs and invalid hex colors from SVG output", () => {
    const malicious = {
      ...DEFAULT_PAPER_SETTINGS,
      lineColor: '" onload="alert(1)',
      logoEnabled: true,
      logoDataUrl: 'javascript:alert(1)"',
      watermarkEnabled: true,
      watermarkText: "<script>alert(1)</script>",
    };
    const { svg } = buildSheetSvg(malicious, 1);
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("javascript:");
    expect(svg).not.toContain('onload="alert');
  });

  it("generates a valid multi-page vector PDF via jsPDF + svg2pdf.js", async () => {
    // jsdom lacks SVGElement.getBBox; polyfill it for svg2pdf text-anchor measurement
    const svgProto = SVGElement.prototype as unknown as {
      getBBox?: () => { x: number; y: number; width: number; height: number };
    };
    const origGetBBox = svgProto.getBBox;
    svgProto.getBBox = () => ({ x: 0, y: 0, width: 12, height: 4 });

    try {
      const bytes = await createPdfDocumentBytes({
        ...DEFAULT_PAPER_SETTINGS,
        paperType: "grid",
        pageCount: 2,
        doubleSided: true,
        showPageNumber: true,
        holePunch: "2-hole",
      });
      const text = new TextDecoder().decode(new Uint8Array(bytes).slice(0, 16));
      expect(text.startsWith("%PDF-")).toBe(true);
      expect(bytes.byteLength).toBeGreaterThan(1500);
    } finally {
      if (origGetBBox) {
        svgProto.getBBox = origGetBBox;
      } else {
        delete svgProto.getBBox;
      }
    }
  });
});
