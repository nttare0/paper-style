import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd());

describe("Web link preview, site essentials, favicon preservation, and security headers", () => {
  it("provides public og-preview.png, existing favicon assets without adding favicon.ico, manifest, sw.js, robots, and sitemap", () => {
    expect(existsSync(resolve(ROOT, "public/favicon.svg"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/favicon.ico"))).toBe(false);
    expect(existsSync(resolve(ROOT, "public/og-preview.png"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/apple-touch-icon.png"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/manifest.webmanifest"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/sw.js"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/robots.txt"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/sitemap.xml"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/icons/icon-192.png"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/icons/icon-512.png"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/icons/icon-maskable-512.png"))).toBe(true);

    const robots = readFileSync(resolve(ROOT, "public/robots.txt"), "utf8");
    expect(robots).toContain("Sitemap: https://paper-style.vercel.app/sitemap.xml");

    const sitemap = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf8");
    expect(sitemap).toContain("<loc>https://paper-style.vercel.app/</loc>");
    expect(sitemap).toContain("<loc>https://paper-style.vercel.app/create/</loc>");
    expect(sitemap).toContain("<loc>https://paper-style.vercel.app/privacy/</loc>");
    expect(sitemap).toContain("<loc>https://paper-style.vercel.app/terms/</loc>");
    expect(sitemap).not.toContain("404");

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

  it("includes unique titles, descriptions, OG/Twitter tags, and preserves existing favicon across all public HTML pages", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const relPath of [
      "index.html",
      "create/index.html",
      "privacy/index.html",
      "terms/index.html",
    ]) {
      const html = readFileSync(resolve(ROOT, relPath), "utf8");
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/s);
      expect(titleMatch?.[1]).toBeTruthy();
      expect(descMatch?.[1]).toBeTruthy();
      titles.add(titleMatch![1]!);
      descriptions.add(descMatch![1]!);

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
      expect(html).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"');
      expect(html).toContain('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"');
      expect(html).not.toContain("favicon.ico");
      expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    }

    expect(titles.size).toBe(4);
    expect(descriptions.size).toBe(4);

    const notFoundHtml = readFileSync(resolve(ROOT, "404.html"), "utf8");
    expect(notFoundHtml).toContain("<title>Page Not Found — PaperStyle</title>");
    expect(notFoundHtml).toContain('name="robots" content="noindex"');
    expect(notFoundHtml).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"');
    expect(notFoundHtml).not.toContain("favicon.ico");
  });

  it("configures required security headers in vercel.json", () => {
    const vercelConfig = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf8")) as {
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    const globalRule = vercelConfig.headers.find((h) => h.source === "/(.*)");
    expect(globalRule).toBeDefined();

    const headerMap = new Map(globalRule!.headers.map((h) => [h.key, h.value]));
    expect(headerMap.get("Strict-Transport-Security")).toContain("max-age=31536000");
    expect(headerMap.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headerMap.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(headerMap.get("Content-Security-Policy")).toContain("base-uri 'none'");
    expect(headerMap.get("X-Frame-Options")).toBe("DENY");
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerMap.get("Permissions-Policy")).toContain("camera=()");
  });

  it("includes compressed WebP landing-page photos under public/images and Unsplash credits", () => {
    expect(existsSync(resolve(ROOT, "CREDITS.md"))).toBe(true);
    const credits = readFileSync(resolve(ROOT, "CREDITS.md"), "utf8");

    for (const file of [
      "public/images/graphing-notebook.webp",
      "public/images/sheet-music-score.webp",
      "public/images/calligraphy-grid-sheets.webp",
    ]) {
      const fullPath = resolve(ROOT, file);
      expect(existsSync(fullPath)).toBe(true);
      expect(statSync(fullPath).size).toBeLessThan(200 * 1024);
      expect(credits).toContain(file);
    }
  });
});
