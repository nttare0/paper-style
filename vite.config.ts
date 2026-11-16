import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function createRoutePlugin(): Plugin {
  const rewriteCreate = (req: { url?: string }, next: () => void) => {
    if (req.url === "/create" || req.url?.startsWith("/create?")) {
      req.url = req.url.replace(/^\/create/, "/create/index.html");
    }
    next();
  };
  return {
    name: "paperstyle-create-route",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => rewriteCreate(req, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => rewriteCreate(req, next));
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
      if (rel === "/sw.js") continue;
      if (rel === "/index.html") {
        results.push("/");
      } else if (rel === "/create/index.html") {
        results.push("/create/");
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
  plugins: [react(), tailwindcss(), createRoutePlugin(), pwaServiceWorkerPlugin()],
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
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        create: resolve(import.meta.dirname, "create/index.html"),
      },
    },
  },
});
