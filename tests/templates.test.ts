import { describe, expect, it } from "vitest";
import { applyTemplateDefaults, DEFAULT_PAPER_SETTINGS, PAPER_TEMPLATES } from "../src/data/templates";
import { THEMES } from "../src/data/themes";
import { buildSheetSvg } from "../src/engine/buildSheetSvg";
import { BACKGROUND_PATTERNS } from "../src/engine/patterns";

describe("Paper template & pattern SVG rendering", () => {
  it("has all 77 paper templates uniquely registered", () => {
    const ids = new Set(PAPER_TEMPLATES.map((t) => t.id));
    expect(PAPER_TEMPLATES.length).toBe(77);
    expect(ids.size).toBe(77);
  });

  it("renders valid, NaN-free SVG for every template", () => {
    for (const tpl of PAPER_TEMPLATES) {
      const settings = applyTemplateDefaults(DEFAULT_PAPER_SETTINGS, tpl.id);
      const { svg } = buildSheetSvg(settings, 1);
      expect(svg.startsWith("<svg ")).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
      expect(svg).not.toContain("NaN");
      expect(svg).not.toContain("undefined");
    }
  });

  it("renders all 13 background patterns and 13 themes cleanly", () => {
    for (const pattern of BACKGROUND_PATTERNS) {
      if (pattern.id === "custom-image") continue;
      const { svg } = buildSheetSvg(
        { ...DEFAULT_PAPER_SETTINGS, backgroundPattern: pattern.id },
        1,
      );
      expect(svg).not.toContain("NaN");
    }

    for (const theme of THEMES) {
      const { svg } = buildSheetSvg(
        {
          ...DEFAULT_PAPER_SETTINGS,
          theme: theme.id,
          backgroundColor: theme.backgroundColor,
          lineColor: theme.lineColor,
          accentColor: theme.accentColor,
          watermarkEnabled: true,
          sidebarEnabled: true,
          showPageNumber: true,
        },
        1,
      );
      expect(svg).toContain(theme.backgroundColor);
      expect(svg).not.toContain("NaN");
    }
  });
});
