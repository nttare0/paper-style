import { describe, expect, it } from "vitest";
import { applyTemplateDefaults, DEFAULT_PAPER_SETTINGS, PAPER_TEMPLATES } from "../src/data/templates";
import { buildSheetSvg } from "../src/engine/buildSheetSvg";
import { computeSheetGeometry } from "../src/engine/geometry";
import { getSheetFields } from "../src/engine/sheetFields";

describe("Simple template-aware sheet editing across all 77 templates", () => {
  it("computes valid in-bounds editable fields for all 77 paper templates", () => {
    for (const tpl of PAPER_TEMPLATES) {
      const settings = applyTemplateDefaults(DEFAULT_PAPER_SETTINGS, tpl.id);
      const geom = computeSheetGeometry(settings, 1);
      const fields = getSheetFields(settings, geom);

      for (const f of fields) {
        expect(Number.isFinite(f.xMm)).toBe(true);
        expect(Number.isFinite(f.yMm)).toBe(true);
        expect(f.widthMm).toBeGreaterThanOrEqual(10);
        expect(f.heightMm).toBeGreaterThanOrEqual(4);
        expect(f.stepMm).toBeGreaterThanOrEqual(3);
        expect(f.xMm).toBeGreaterThanOrEqual(0);
        expect(f.yMm).toBeGreaterThanOrEqual(0);
        expect(f.xMm + f.widthMm).toBeLessThanOrEqual(geom.widthMm + 0.01);
        expect(f.yMm + f.heightMm).toBeLessThanOrEqual(geom.heightMm + 0.01);
      }
    }
  });

  it("aligns Cornell Notes fields cleanly to Topic, Cues, Notes, and Summary", () => {
    const settings = applyTemplateDefaults(DEFAULT_PAPER_SETTINGS, "cornell-notes");
    const geom = computeSheetGeometry(settings, 1);
    const fields = getSheetFields(settings, geom);
    const byId = Object.fromEntries(fields.map((f) => [f.id, f]));

    expect(byId.topic).toBeDefined();
    expect(byId.cues).toBeDefined();
    expect(byId.notes).toBeDefined();
    expect(byId.summary).toBeDefined();
    expect(byId.cues!.xMm + byId.cues!.widthMm).toBeLessThan(byId.notes!.xMm);
    expect(byId.summary!.yMm).toBeGreaterThan(byId.notes!.yMm + byId.notes!.heightMm);
  });

  it("provides individual day boxes on Weekly Planner and cell boxes on Monthly Calendar", () => {
    const weekly = applyTemplateDefaults(DEFAULT_PAPER_SETTINGS, "weekly-planner");
    const wFields = getSheetFields(weekly, computeSheetGeometry(weekly, 1));
    expect(wFields.some((f) => f.label === "Monday")).toBe(true);
    expect(wFields.some((f) => f.label === "Weekly Notes")).toBe(true);

    const cal = applyTemplateDefaults(DEFAULT_PAPER_SETTINGS, "monthly-calendar");
    const cFields = getSheetFields(cal, computeSheetGeometry(cal, 1));
    expect(cFields.some((f) => f.id === "month")).toBe(true);
    expect(cFields.some((f) => f.id === "year")).toBe(true);
    expect(cFields.some((f) => f.id === "cal-0-0")).toBe(true);
    expect(cFields.some((f) => f.id === "cal-4-6")).toBe(true);
    expect(cFields.some((f) => f.id === "notes")).toBe(true);
  });

  it("renders typed template fields and click-anywhere blocks cleanly into SVG output", () => {
    const settings = {
      ...applyTemplateDefaults(DEFAULT_PAPER_SETTINGS, "swot-analysis"),
      inkColor: "#1D4ED8",
      pageFields: {
        "1": {
          date: "2026-11-16",
          "quad-0": "Fast SVG engine",
          "quad-1": "Needs print check",
        },
      },
      pageTextBlocks: {
        "1": [{ id: "free1", xMm: 25, yMm: 220, widthMm: 60, text: "Custom footnote" }],
      },
    };
    const { svg } = buildSheetSvg(settings, 1);
    expect(svg).toContain("2026-11-16");
    expect(svg).toContain("Fast SVG engine");
    expect(svg).toContain("Needs print check");
    expect(svg).toContain("Custom footnote");
    expect(svg).toContain("#1D4ED8");
  });
});
