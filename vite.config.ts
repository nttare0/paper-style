import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function routeRewritePlugin(): Plugin {
  const rewriteRoutes = (req: { url?: string }, next: () => void) => {
    if (req.url === "/create" || req.url?.startsWith("/create?")) {
      req.url = req.url.replace(/^\/create/, "/create/index.html");
    } else if (req.url === "/privacy" || req.url?.startsWith("/privacy?")) {
      req.url = req.url.replace(/^\/privacy/, "/privacy/index.html");
    } else if (req.url === "/terms" || req.url?.startsWith("/terms?")) {
      req.url = req.url.replace(/^\/terms/, "/terms/index.html");
    }
    next();
  };
  return {
    name: "paperstyle-route-rewrites",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => rewriteRoutes(req, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => rewriteRoutes(req, next));
    },
  };
}

function collectDistFiles(dir: string, rootDir: string): string[] {
  const entries = readdirSync(dir);
  const results: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectDistFiles(full, rootDir));
    } else {
      const rel = "/" + relative(rootDir, full).replace(/\\/g, "/");
      if (rel === "/sw.js" || rel === "/404.html") continue;
      if (rel === "/index.html") {
        results.push("/");
      } else if (rel === "/create/index.html") {
        results.push("/create/");
      } else if (rel === "/privacy/index.html") {
        results.push("/privacy/");
      } else if (rel === "/terms/index.html") {
        results.push("/terms/");
      } else {
        results.push(rel);
      }
    }
  }
  return results.sort();
}

function pwaServiceWorkerPlugin(): Plugin {
  let outDir = resolve(import.meta.dirname, "dist");
  return {
    name: "paperstyle-pwa-sw",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const urls = collectDistFiles(outDir, outDir);
      const hash = createHash("sha256")
        .update(urls.join("\n"))
        .digest("hex")
        .slice(0, 10);
      const swSrc = readFileSync(resolve(import.meta.dirname, "public/sw.js"), "utf8");
      const builtSw = swSrc
        .replace(/const CACHE_VERSION = [^;]+;/, `const CACHE_VERSION = "paperstyle-${hash}";`)
        .replace(
          /const PRECACHE_URLS = \[[\s\S]*?\];/,
          `const PRECACHE_URLS = ${JSON.stringify(urls, null, 2)};`,
        );
      writeFileSync(join(outDir, "sw.js"), builtSw, "utf8");
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), routeRewritePlugin(), pwaServiceWorkerPlugin()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        create: resolve(import.meta.dirname, "create/index.html"),
        privacy: resolve(import.meta.dirname, "privacy/index.html"),
        terms: resolve(import.meta.dirname, "terms/index.html"),
        notFound: resolve(import.meta.dirname, "404.html"),
      },
    },
  },
});
