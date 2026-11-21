import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["_site/", "node_modules/", "content/", ".lighthouseci/", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  {
    files: ["static/js/**/*.js"],
    languageOptions: { sourceType: "script", globals: globals.browser },
  },
  {
    files: ["scripts/**/*.mjs", "tests/**/*.mjs", "*.mjs", "*.cjs"],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright tests run in Node but pass callbacks to the browser (page.evaluate, addInitScript).
    files: ["tests/e2e/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      eqeqeq: "error",
      "no-implicit-globals": "error",
    },
  },
];
