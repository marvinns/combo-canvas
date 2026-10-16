import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const base = process.env.BASE_PATH || "/";

  return {
    base,
    server: {
      host: "::",
      port: 8080,
      allowedHosts: [".trycloudflare.com"],
      hmr: {
        overlay: false,
      },
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.endsWith('/src/data/combo-library-seed.json')) return 'combo-seed';
            if (!id.includes('/node_modules/')) return;
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor';
            if (/\/node_modules\/(motion|motion-dom|motion-utils|framer-motion)\//.test(id)) return 'motion-vendor';
            if (id.includes('/node_modules/@radix-ui/')) return 'ui-vendor';
            return 'vendor';
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
