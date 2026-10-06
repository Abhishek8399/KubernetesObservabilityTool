import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.PUBLIC_BASE_PATH ?? "/",
  plugins: [react()],
  server: {
    proxy: { "/api": { target: "http://127.0.0.1:8788", changeOrigin: false } },
  },
  build: { outDir: "dist-static", emptyOutDir: true },
});
