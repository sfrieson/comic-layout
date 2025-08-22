import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import reactRefresh from "eslint-plugin-react-refresh";

export default defineConfig([
  globalIgnores(["node_modules", "dist", "build", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      pluginReact,
    },
    // rules: {
    //   "react/jsx-uses-react": "error",
    //   "react/jsx-uses-vars": "error",
    // },
  },
  pluginReactHooks.configs["recommended-latest"],
  pluginReact.configs.flat["jsx-runtime"],
  reactRefresh.configs.vite,
  eslintConfigPrettier,
]);
