import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    watch: { usePolling: true, interval: 250 },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/")
          )
            return "framework";
          if (
            id.includes("/node_modules/@supabase/") ||
            id.includes("/node_modules/jose/")
          )
            return "realtime";
        },
      },
    },
  },
});
