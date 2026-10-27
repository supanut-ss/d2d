import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(projectRoot, "index.html"),
        hwmonitor: resolve(projectRoot, "hwmonitor.html"),
        disccleanup: resolve(projectRoot, "disccleanup.html"),
        concept: resolve(projectRoot, "pimsaduak.html"),
        meestock: resolve(projectRoot, "meestock.html"),
        partygame: resolve(projectRoot, "partygame.html"),
        booksabuy: resolve(projectRoot, "booksabuy.html"),
        qrOrdering: resolve(projectRoot, "qr-ordering.html"),
        sabaizy: resolve(projectRoot, "sabaizy.html"),
        payyet: resolve(projectRoot, "payyet.html"),
        joddaily: resolve(projectRoot, "joddaily.html"),
      },
    },
  },
});
