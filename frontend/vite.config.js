import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Ports 5175 / 8002, so it runs next to Rohat (5173 / 8000) and Muhojir (5174 / 8001).
// /api/... goes to FastAPI without the /api part, /media/... (covers, audio) goes there as is.
const API = "http://127.0.0.1:8002";

const proxy = {
  "/api": { target: API, rewrite: (path) => path.replace(/^\/api/, "") },
  "/media": API,
  "/openapi.json": API, // for Swagger at /api/docs
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5175, proxy },
  preview: { port: 4175, proxy },
});
