import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "release/**",
      "reports/**",
      "coverage/**",
      ".codefixer_backups/**",
      "**/*.backup.*",
      "**/*.diff",
      "**/*.patch",
      "**/*.cjs",
      "**/*.config.js",
      "**/*.config.ts",
      "vite.config.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // TS/React projects should rely on TS for undefined checks
      "no-undef": "off",
      "no-unused-vars": "off",

      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",

      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Matches typical Vite React template behavior
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // Some generated/legacy code contains escapes that are safe.
      "no-useless-escape": "off",
      "no-unused-labels": "off",
      "no-empty": "off",
      "no-redeclare": "off",
      "no-case-declarations": "off",
      "no-useless-catch": "off",
      "require-yield": "off",
      "no-import-assign": "off",
      "no-irregular-whitespace": "off",
      "no-prototype-builtins": "off",
      "no-dupe-else-if": "off",

      "@typescript-eslint/no-unsafe-function-type": "off",
    },
  },
];
