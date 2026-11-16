import { describe, expect, it } from "vitest";
import { DEFAULT_PAPER_SETTINGS } from "../src/data/templates";
import { buildSheetSvg } from "../src/engine/buildSheetSvg";
import { computeSheetGeometry } from "../src/engine/geometry";
import { createBlockAtPoint } from "../src/engine/writingBox";

describe("Universal simple click-anywhere sheet editing", () => {
  it("keeps Weekly Planner notes contained within the clicked day box", () => {
    const settings = { ...DEFAULT_PAPER_SETTINGS, paperType: "weekly-planner" as const };
    const geom = computeSheetGeometry(settings, 1);

    // Click inside top-left box (MONDAY)
    const mondayBlock = createBlockAtPoint(settings, geom, 22, 32, "b1");
    expect(mondayBlock.xMm).toBeGreaterThanOrEqual(geom.contentBox.x);
    expect(mondayBlock.xMm + mondayBlock.widthMm).toBeLessThan(geom.contentBox.x + geom.contentBox.width / 2);

    // Click inside top-right box (TUESDAY)
    const tuesdayBlock = createBlockAtPoint(settings, geom, 120, 32, "b2");
    expect(tuesdayBlock.xMm).toBeGreaterThan(geom.contentBox.x + geom.contentBox.width / 2);
    expect(tuesdayBlock.xMm + tuesdayBlock.widthMm).toBeLessThanOrEqual(geom.contentBox.right);
  });

  it("keeps Monthly Calendar notes contained within a single calendar cell", () => {
    const settings = {
      ...DEFAULT_PAPER_SETTINGS,
      paperType: "monthly-calendar" as const,
      orientation: "landscape" as const,
    };
    const geom = computeSheetGeometry(settings, 1);

    // Click inside column 2, row 1 day cell
    const calW = geom.contentBox.width * 0.82 - 4;
    const cellW = calW / 7;
    const clickX = geom.contentBox.x + cellW * 2.3;
    const block = createBlockAtPoint(settings, geom, clickX, 70, "cal1");

    expect(block.widthMm).toBeLessThan(cellW);
    expect(block.xMm).toBeGreaterThanOrEqual(geom.contentBox.x + cellW * 2);
    expect(block.xMm + block.widthMm).toBeLessThanOrEqual(geom.contentBox.x + cellW * 3);
  });

  it("places Cornell Notes blocks cleanly inside Cues, Notes, or Summary", () => {
    const settings = { ...DEFAULT_PAPER_SETTINGS, paperType: "cornell-notes" as const };
    const geom = computeSheetGeometry(settings, 1);

    const cueBlock = createBlockAtPoint(settings, geom, 20, 60, "c1");
    expect(cueBlock.xMm + cueBlock.widthMm).toBeLessThan(69);

    const notesBlock = createBlockAtPoint(settings, geom, 80, 60, "c2");
    expect(notesBlock.xMm).toBeGreaterThanOrEqual(71);
    expect(notesBlock.xMm + notesBlock.widthMm).toBeLessThanOrEqual(geom.contentBox.right);

    const summaryBlock = createBlockAtPoint(settings, geom, 25, 250, "c3");
    expect(summaryBlock.yMm).toBeGreaterThanOrEqual(235);
  });

  it("renders multi-block notes cleanly into final SVG output", () => {
    const settings = {
      ...DEFAULT_PAPER_SETTINGS,
      paperType: "swot-analysis" as const,
      pageTextBlocks: {
        "1": [
          { id: "s1", xMm: 20, yMm: 30, widthMm: 70, text: "Fast SVG engine", color: "#1D4ED8" },
          { id: "w1", xMm: 112, yMm: 30, widthMm: 70, text: "Needs print check", color: "#B91C1C" },
        ],
      },
    };
    const { svg } = buildSheetSvg(settings, 1);
    expect(svg).toContain("Fast SVG engine");
    expect(svg).toContain("#1D4ED8");
    expect(svg).toContain("Needs print check");
    expect(svg).toContain("#B91C1C");
  });
});
