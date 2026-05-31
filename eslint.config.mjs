import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
      "no-undef": "off",
    },
  },
]);
