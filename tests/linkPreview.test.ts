import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd());

describe("Web link preview metadata & assets", () => {
  it("provides public og-preview.png and apple-touch-icon.png assets", () => {
    expect(existsSync(resolve(ROOT, "public/og-preview.png"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/apple-touch-icon.png"))).toBe(true);
  });

  it("includes Open Graph and Twitter summary_large_image tags on / and /create/", () => {
    for (const relPath of ["index.html", "create/index.html"]) {
      const html = readFileSync(resolve(ROOT, relPath), "utf8");
      expect(html).toContain('property="og:type" content="website"');
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain(
        'property="og:image" content="https://paper-style.vercel.app/og-preview.png"',
      );
      expect(html).toContain('property="og:image:width" content="1200"');
      expect(html).toContain('property="og:image:height" content="630"');
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(html).toContain(
        'name="twitter:image" content="https://paper-style.vercel.app/og-preview.png"',
      );
      expect(html).toContain('rel="canonical"');
      expect(html).toContain('rel="apple-touch-icon"');
    }
  });
});
