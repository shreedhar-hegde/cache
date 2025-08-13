// eslint.config.mjs
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier";

/**
 * Flat config for ESLint 9+
 */
export default [
  {
    ignores: ["dist/", "*.d.ts", "node_modules/"], // Ignore only build output and type declarations
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      prettier: eslintPluginPrettier,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
];
