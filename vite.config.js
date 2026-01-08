import vue from "@vitejs/plugin-vue";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";

const useHttps = process.env.HTTPS === "1" || process.env.VITE_HTTPS === "1";

export default defineConfig({
  plugins: [vue(), useHttps ? basicSsl() : null].filter(Boolean),
  server: {
    https: useHttps,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.YOUTUBE_PROXY_PORT || 4174}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
