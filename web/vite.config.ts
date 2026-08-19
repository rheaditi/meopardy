import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Go server owns the API and the built app. In dev, Vite serves the UI on
// :5173 and proxies /api calls to the Go server on :8080.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Bundle under /static so the /assets/ URL is free for game image assets
    // served by the Go server from disk.
    assetsDir: "static",
  },
  server: {
    proxy: {
      // ws: true so the /api/ws WebSocket is proxied to the Go server in dev.
      "/api": { target: "http://localhost:8080", ws: true },
    },
  },
});
