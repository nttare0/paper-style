import { describe, expect, it } from "vitest";
import { MM_PER_INCH, mmToUnit, unitToMm } from "../src/data/sizes";
import { DEFAULT_PAPER_SETTINGS } from "../src/data/templates";
import { resolvePrintColor } from "../src/data/themes";
import {
  computeGridStep,
  computeHolePunchMarks,
  computeSheetGeometry,
  resolvePageDimensions,
  validatePaperSettings,
} from "../src/engine/geometry";

describe("Paper geometry & sizing", () => {
  it("converts between mm and inches accurately", () => {
    expect(mmToUnit(25.4, "in")).toBeCloseTo(1, 6);
    expect(unitToMm(8.5, "in")).toBeCloseTo(215.9, 4);
    expect(unitToMm(11, "in")).toBeCloseTo(279.4, 4);
    expect(MM_PER_INCH).toBe(25.4);
  });

  it("resolves standard and landscape page dimensions", () => {
    const a4 = resolvePageDimensions(DEFAULT_PAPER_SETTINGS);
    expect(a4).toEqual({ widthMm: 210, heightMm: 297 });

    const a4Landscape = resolvePageDimensions({
      ...DEFAULT_PAPER_SETTINGS,
      orientation: "landscape",
    });
    expect(a4Landscape).toEqual({ widthMm: 297, heightMm: 210 });

    const letter = resolvePageDimensions({
      ...DEFAULT_PAPER_SETTINGS,
      paperSize: "letter",
    });
    expect(letter.widthMm).toBeCloseTo(215.9, 2);
    expect(letter.heightMm).toBeCloseTo(279.4, 2);
  });

  it("computes fill-to-margins edge-to-edge without remainder gaps", () => {
    const fill = computeGridStep(250, 8, "fill");
    expect(fill.count * fill.stepMm).toBeCloseTo(250, 6);
    expect(fill.count).toBe(31);

    const fixed = computeGridStep(250, 8, "fixed");
    expect(fixed.stepMm).toBe(8);
    expect(fixed.count).toBe(31);
    expect(fixed.count * fixed.stepMm).toBe(248);
  });

  it("mirrors asymmetric margins and left-edge hole punches on duplex back pages", () => {
    const settings = {
      ...DEFAULT_PAPER_SETTINGS,
      linkMargins: false,
      marginsMm: { top: 15, right: 10, bottom: 15, left: 25 },
      holePunch: "3-hole" as const,
      doubleSided: true,
      pageCount: 2,
    };

    const frontGeom = computeSheetGeometry(settings, 1);
    const backGeom = computeSheetGeometry(settings, 2);
    expect(frontGeom.margins.left).toBe(25);
    expect(frontGeom.margins.right).toBe(10);
    expect(backGeom.margins.left).toBe(10);
    expect(backGeom.margins.right).toBe(25);

    const frontHoles = computeHolePunchMarks("3-hole", 210, 297, false);
    const backHoles = computeHolePunchMarks("3-hole", 210, 297, true);
    expect(frontHoles).toHaveLength(3);
    expect(backHoles).toHaveLength(3);
    expect(frontHoles[0]!.cx).toBe(12);
    expect(backHoles[0]!.cx).toBe(210 - 12);
    expect(frontHoles[2]!.cy - frontHoles[1]!.cy).toBeCloseTo(4.25 * 25.4, 2);
  });

  it("computes 5-hole punch combining 3-hole and 2-hole positions", () => {
    const holes = computeHolePunchMarks("5-hole", 210, 297, false);
    expect(holes).toHaveLength(5);
  });

  it("validates page count, custom sizes, and margins", () => {
    const err1 = validatePaperSettings({ ...DEFAULT_PAPER_SETTINGS, pageCount: 101 });
    expect(err1.pageCount).toBeDefined();

    const err2 = validatePaperSettings({
      ...DEFAULT_PAPER_SETTINGS,
      paperSize: "custom",
      customWidthMm: 5,
    });
    expect(err2.customWidth).toBeDefined();

    const err3 = validatePaperSettings({
      ...DEFAULT_PAPER_SETTINGS,
      marginsMm: { top: 150, right: 100, bottom: 150, left: 100 },
    });
    expect(err3.margins).toBeDefined();
  });

  it("maps colors to clean grayscale in B&W laser mode", () => {
    expect(resolvePrintColor("#1E3A8A", "background", "bw")).toBe("#FFFFFF");
    const lineGray = resolvePrintColor("#2563EB", "line", "bw");
    expect(lineGray).toMatch(/^#([0-9A-F]{2})\1\1$/);
  });
});
