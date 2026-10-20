import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  define: {
    __POLLEN_VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV ?? ""),
  },
  server: {
    host: "::",
    port: 8081,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
