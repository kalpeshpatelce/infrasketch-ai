import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // For GitHub Pages: set base to repo name
  // Change 'InfraSketch-AI' to your actual repo name if different
  base: process.env.NODE_ENV === "production" ? "/InfraSketch-AI/" : "/",
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
});
