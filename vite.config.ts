import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./package.json"), "utf-8"),
);

export default defineConfig({
  base: "./",
  server: { host: true, port: 5174 },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
