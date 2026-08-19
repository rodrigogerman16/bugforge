import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Unit tests only — pure logic under src/lib/**, colocated as *.test.ts next
// to the module they cover. No jsdom/React Testing Library here on purpose:
// nothing in the current suite renders a component, so pulling in a DOM
// environment would just be dead weight (see item 64's "don't install
// unless it provides meaningful value"). Add one if a component test
// actually needs it.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
