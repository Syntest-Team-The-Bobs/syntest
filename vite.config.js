import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000", // Flask backend
        changeOrigin: true,
        secure: false,
        ws: true,
        cookieDomainRewrite: "localhost", // <--- Fix this
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.error("Vite proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("→ Proxying request:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("← Proxy response:", proxyRes.statusCode, req.url);
            proxyRes.headers["Access-Control-Allow-Origin"] =
              req.headers.origin || "*";
            proxyRes.headers["Access-Control-Allow-Credentials"] = "true";
          });
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    css: false,
  },
});
