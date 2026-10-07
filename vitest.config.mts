import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "node_modules/next/dist/compiled/server-only/empty.js"),
      "@": path.resolve(__dirname, "."),
    },
  },
});
