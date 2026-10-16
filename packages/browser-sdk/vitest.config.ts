import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "https://restaurant.test/" } },
    include: ["tests/**/*.test.ts"],
  },
});
