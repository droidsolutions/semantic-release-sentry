import js from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import jestPlugin from "eslint-plugin-jest";
import nodePlugin from "eslint-plugin-n";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Files/directories that should never be linted.
  {
    ignores: ["dist/", "coverage/"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  // Sources are authored as ES modules (.mts, compiled by TypeScript), so lint
  // against the module preset.
  nodePlugin.configs["flat/recommended-module"],
  // Keep eslint-config-prettier + eslint-plugin-prettier last so formatting
  // rules win over any stylistic rules enabled above.
  prettierRecommended,
  {
    files: ["**/*.{ts,mts,js,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // TypeScript resolves modules itself; eslint-plugin-n cannot reliably
      // follow extension/path resolution for .mts imports.
      "n/no-missing-import": "off",
    },
  },
  // Test files run under Jest.
  {
    files: ["test/**/*.mts"],
    ...jestPlugin.configs["flat/recommended"],
  },
  // CommonJS helpers (e.g. the Jest transformer shim) that must stay CJS.
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
