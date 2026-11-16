import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd());

describe("Web link preview & PWA installability assets", () => {
  it("provides public og-preview.png, apple-touch-icon.png, manifest, sw.js, and PWA icons", () => {
    expect(existsSync(resolve(ROOT, "public/og-preview.png"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/apple-touch-icon.png"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/manifest.webmanifest"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/sw.js"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/icons/icon-192.png"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/icons/icon-512.png"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/icons/icon-maskable-512.png"))).toBe(true);

    const manifest = JSON.parse(
      readFileSync(resolve(ROOT, "public/manifest.webmanifest"), "utf8"),
    ) as {
      name: string;
      short_name: string;
      display: string;
      start_url: string;
      scope: string;
      icons: { src: string; sizes: string; purpose?: string }[];
    };
    expect(manifest.short_name).toBe("PaperStyle");
    expect(manifest.display).toBe("standalone");
    expect(manifest.scope).toBe("/");
    expect(manifest.start_url).toBe("/create/");
    expect(manifest.icons.some((i) => i.sizes === "192x192")).toBe(true);
    expect(manifest.icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable")).toBe(true);
  });

  it("includes Open Graph, Twitter summary_large_image, manifest, and PWA meta tags on / and /create/", () => {
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
      expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
      expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    }
  });
});
