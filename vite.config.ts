import { resolve } from "node:path";
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

export default defineConfig({
  plugins: [react(), tailwindcss(), createRoutePlugin()],
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
