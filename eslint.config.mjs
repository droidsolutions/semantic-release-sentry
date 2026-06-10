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
  // Sources are run by Node. They are authored with ES module syntax (compiled
  // by TypeScript) and the package will be converted to ESM in the future, so
  // lint against the module preset.
  nodePlugin.configs["flat/recommended-module"],
  // Keep eslint-config-prettier + eslint-plugin-prettier last so formatting
  // rules win over any stylistic rules enabled above.
  prettierRecommended,
  {
    files: ["**/*.ts", "**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // TypeScript resolves modules itself; eslint-plugin-n cannot reliably
      // follow extension/path resolution for .ts imports.
      "n/no-missing-import": "off",
    },
  },
  // Test files run under Jest.
  {
    files: ["test/**/*.ts"],
    ...jestPlugin.configs["flat/recommended"],
  },
);
