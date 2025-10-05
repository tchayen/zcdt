import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import unicorn from "eslint-plugin-unicorn";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      unicorn,
    },
    rules: {
      // TypeScript recommended rules
      ...tseslint.configs.recommended.rules,

      // Unicorn recommended rules
      ...unicorn.configs.recommended.rules,

      // Custom overrides
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",

      // Unicorn customizations - be more lenient for this codebase
      "unicorn/prefer-module": "off", // We're using ES modules
      "unicorn/prefer-node-protocol": "off", // Not using Node.js
      "unicorn/no-null": "off", // We use null for edge cases
      "unicorn/filename-case": "off", // Keep existing naming convention
      "unicorn/prevent-abbreviations": "off", // Too strict for geometric code
      "unicorn/prefer-single-call": "off", // Multiple pushes are fine
      "unicorn/no-this-assignment": "off", // Allow `const ctx = this`
      "@typescript-eslint/no-this-alias": "off", // Allow `const ctx = this`

      // Keep useful unicorn rules
      "unicorn/prefer-number-properties": "error",
      "unicorn/prefer-array-some": "error",
      "unicorn/prefer-array-find": "error",
      "unicorn/prefer-array-index-of": "error",
      "unicorn/prefer-includes": "error",
      "unicorn/prefer-string-starts-ends-with": "error",
      "unicorn/prefer-string-slice": "error",
      "unicorn/prefer-string-trim-start-end": "error",
      "unicorn/prefer-type-error": "error",
      "unicorn/throw-new-error": "error",

      // General rules
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      // Relax some rules for test files
      "@typescript-eslint/no-explicit-any": "off",
      "unicorn/no-null": "off",
      "unicorn/prevent-abbreviations": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "*.config.js",
      "*.config.ts",
    ],
  },
];
