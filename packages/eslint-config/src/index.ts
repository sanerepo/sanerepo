/// <reference types="node" />

module.exports = {
  env: {
    es2021: true,
  },
  ignorePatterns: ["*.cjs", "lib", "node_modules"],
  extends: [
    "eslint:recommended",
    "plugin:import/typescript",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./packages/*/tsconfig.json"],
  },
  plugins: ["@typescript-eslint", "import", "unused-imports"],
  rules: {
    "@typescript-eslint/consistent-type-exports": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-import-type-side-effects": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-this-alias": "off",

    // BEGIN Imports and unused vars
    "import/no-duplicates": ["error", { "prefer-inline": false }],
    "import/order": ["error", { groups: ["builtin", "external", "internal"] }],

    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
    // END Imports and unused vars

    "no-console": "error",
    "@typescript-eslint/ban-types": "off", // terribly obnoxious since we need Symbol from ts-morph
  },
  reportUnusedDisableDirectives: true,
  overrides: [
    {
      files: ["*.test.ts"],
      rules: {
        "@typescript-eslint/no-unused-vars": "off",
        "unused-imports/no-unused-imports": "off",
        "unused-imports/no-unused-vars": "off",
      },
    },
  ],
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"],
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
        // use a glob pattern
        project: "packages/*/tsconfig.json",
      },
      node: true,
    },
  },
};
