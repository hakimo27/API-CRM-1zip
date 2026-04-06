import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const isReplit = process.env.REPL_ID !== undefined;
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

// BASE_PATH is injected by the Replit artifact runtime (artifact.toml → [services.env]).
// In Docker production the same var is passed in docker-compose.
// Fallback keeps local dev working without any env setup.
const basePath = (process.env.BASE_PATH ?? "/crm/").replace(/\/$/, "") + "/"; // always ends with /
const baseNoSlash = basePath.slice(0, -1); // "/crm"  (no trailing slash, for matching)

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),

    // ─── SPA fallback for subpath proxying ─────────────────────────────────
    // The Replit proxy strips the /crm/ prefix before forwarding requests to
    // this Vite dev server.  Vite's own SPA fallback only fires for paths that
    // start with `base` (/crm/), so a bare /chat or /orders request would
    // return 404.  This plugin intercepts those requests BEFORE Vite's own
    // middleware and rewrites them to the base path so Vite serves index.html.
    {
      name: "crm-spa-fallback",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url ?? "/";
          // Skip Vite internals, WebSocket upgrades, and actual files
          if (
            url.startsWith("/@") ||
            url.startsWith("/node_modules/") ||
            url.includes(".") ||
            url.startsWith("/api/") ||
            url.startsWith("/socket.io/")
          ) {
            return next();
          }
          // If the request path is NOT already under the base path, rewrite it.
          // This handles both:
          //   • Replit strips prefix → Vite gets /chat  (not under /crm/)
          //   • Replit keeps prefix  → Vite gets /crm/chat (already under base, skip)
          const isHtml = (req.headers.accept ?? "").includes("text/html");
          if (isHtml && !url.startsWith(basePath) && url !== baseNoSlash) {
            req.url = basePath; // rewrite to base; Vite serves index.html
          }
          next();
        });
      },
    },

    ...(isReplit
      ? [
          (await import("@replit/vite-plugin-runtime-error-modal")).default(),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({ root: path.resolve(import.meta.dirname, "..") }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    // Ensure Vite also applies its own SPA fallback for paths under the base
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
