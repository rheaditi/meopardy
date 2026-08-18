import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Go server owns the API and the built app. In dev, Vite serves the UI on
// :5173 and proxies /api calls to the Go server on :8080.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
