import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import type { Config, Context } from "@monorepolint/config";
import {
  alphabeticalDependencies,
  alphabeticalScripts,
  fileContents,
  packageEntry,
  packageOrder,
  standardTsconfig,
  packageScript,
  requireDependency,
} from "@monorepolint/rules";

import { findWorkspaceDir, SimpleHost } from "@monorepolint/utils";

const host = new SimpleHost(fs);
const workspaceDir = await findWorkspaceDir(host, process.cwd());

if (!workspaceDir) {
  throw new Error("Failed to find a workspace dir, which is required for sanerepo");
}

const rootPackageName = host.readJson(path.join(workspaceDir, "package.json")).name ?? workspaceDir;

interface SaneRepoConfig {
  esmOnly?: string[];
  cjsOnly?: string[];
}

const saneRepoConfig: SaneRepoConfig =
  host.readJson(path.join(workspaceDir, ".sanerepo.json")) ?? {};

const rootFilesToSet = [
  ".eslintrc.cjs",
  ".gitignore",
  ".husky/pre-commit",
  ".lintstagedrc",
  ".monorepolint.config.mjs",
  ".prettierignore",
  ".prettierrc",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "tsup.config.js",
  "turbo.json",
];

const config: Config = {
  // ROOT RULES
  rules: [
    ...rootFilesToSet.map((filename) =>
      fileContents({
        includeWorkspaceRoot: true,
        includePackages: [rootPackageName],
        options: {
          file: filename,
          templateFile: url.fileURLToPath(new URL(`../files/${filename}`, import.meta.url)),
        },
      })
    ),
    fileContents({
      includePackages: [rootPackageName],
      includeWorkspaceRoot: true,
      options: {
        file: "jest.config.cjs",
        generator: async (context: Context) => {
          const templateFilePath = url.fileURLToPath(
            new URL(`../templates/jest.config.cjs`, import.meta.url)
          );
          const templateContents = context
            .getWorkspaceContext()
            .host.readFile(templateFilePath, { encoding: "utf-8" });
          const foo = (await context.getWorkspaceContext().getWorkspacePackageDirs())
            .map((a) => `"${path.basename(a)}"`)
            .join(", ");

          return templateContents.replace(`"INSERT_PROJECT_DIRS"`, foo);
        },
      },
    }),
    packageScript({
      includeWorkspaceRoot: true,
      includePackages: [rootPackageName],
      options: {
        scripts: {
          build: "turbo build",
          "check-eslint": "eslint packages/*/src",
          "check-jest":
            "NODE_OPTIONS='--experimental-vm-modules --no-warnings' jest --passWithNoTests",
          "check-prettier": "prettier --check .",
          "check-typescript": "tsc --build --pretty packages/*/tsconfig.json",
          "ci:publish-snapshot":
            "pnpm prepublishOnly && pnpm check-eslint && pnpm changeset version --snapshot && pnpm publish -r --tag snapshot --access public --report-summary --no-git-checks",
          "ci:publish": "pnpm publish -r --tag next --access public --report-summary.json",
          cloc: "cloc --exclude-ext=yaml --exclude-ext=log --exclude-ext=txt --exclude-ext=json --match-d='src' --fullpath --not-match-d='node_modules|lib'  . ",
          "debug:test":
            "NODE_OPTIONS='--experimental-vm-modules --no-warnings --inspect-brk' jest --runInBand --detectOpenHandles",
          "dev-mode":
            "concurrently -c auto --color --names 'ts    ,eslint,jest  ' 'npm:watch-typescript' 'npm:watch-eslint' npm:watch-jest",
          "fix-eslint": "eslint packages/*/src --fix",
          "fix-prettier": "prettier --write .",
          precommit: "pnpm fix-eslint && pnpm fix-prettier",
          prepare: "husky install",
          prepublishOnly: "pnpm run build && pnpm test",
          test: "pnpm check-eslint && pnpm check-jest && pnpm check-prettier && pnpm check-typescript",
          "watch-eslint":
            "pnpm check-eslint; chokidar 'packages/*/src/**.ts' 'packages/*/src/**.tsx' -c eslint",
          "watch-jest": "pnpm check-jest --watch",
          "watch-typescript": "pnpm check-typescript --preserveWatchOutput --watch",
        },
      },
    }),

    //
    // Neither cjsOnly nor esmOnly
    //
    packageEntry({
      excludePackages: [...(saneRepoConfig.esmOnly ?? []), ...(saneRepoConfig.cjsOnly ?? [])],
      options: {
        entries: {
          type: "module",
          exports: {
            ".": {
              types: "./dist/index.d.ts",
              import: "./dist/index.js",
              require: "./dist/index.cjs.",
            },
          },
          files: ["bin", "lib", "files"],
          publishConfig: {
            access: "public",
          },
        },
      },
    }),

    packageScript({
      includeWorkspaceRoot: false,
      excludePackages: [...(saneRepoConfig.esmOnly ?? []), ...(saneRepoConfig.cjsOnly ?? [])],
      options: {
        scripts: {
          "transpile-typescript": "tsup --format esm,cjs",
        },
      },
    }),

    //
    // esmOnly
    //

    ...(saneRepoConfig.esmOnly && saneRepoConfig.esmOnly.length > 0
      ? [
          packageEntry({
            includePackages: saneRepoConfig.esmOnly,
            options: {
              entries: {
                type: "module",
                exports: {
                  ".": {
                    types: "./dist/index.d.ts",
                    import: "./dist/index.js",
                  },
                },
              },
            },
          }),
          packageScript({
            includeWorkspaceRoot: false,
            includePackages: saneRepoConfig.esmOnly,
            options: {
              scripts: {
                "transpile-typescript": "tsup --format esm",
              },
            },
          }),
        ]
      : []),

    //
    // cjsOnly
    //

    ...(saneRepoConfig.cjsOnly && saneRepoConfig.cjsOnly.length > 0
      ? [
          packageEntry({
            includePackages: saneRepoConfig.cjsOnly,
            options: {
              entries: {
                type: "commonjs",
                exports: {
                  ".": {
                    types: "./dist/index.d.ts",
                    require: "./dist/index.js",
                  },
                },
              },
            },
          }),
          packageScript({
            includeWorkspaceRoot: false,
            includePackages: saneRepoConfig.cjsOnly,
            options: {
              scripts: {
                "transpile-typescript": "tsup --format cjs",
              },
            },
          }),
        ]
      : []),

    // Everyone rules

    requireDependency({
      includeWorkspaceRoot: true,
      includePackages: [rootPackageName],
      options: {
        devDependencies: {
          "@changesets/cli": "^2.26.1",
          "@monorepolint/cli": "^0.5.0-alpha.108",
          "@swc/jest": "^0.2.26",
          "@typescript-eslint/eslint-plugin": "^5.60.0",
          "@typescript-eslint/parser": "^5.60.0",
          "chokidar-cli": "^3.0.0",
          concurrently: "^8.2.0",
          eslint: "^8.43.0",
          "eslint-import-resolver-typescript": "^3.5.5",
          "eslint-plugin-import": "^2.27.5",
          "eslint-plugin-unused-imports": "^2.0.0",
          husky: "^8.0.3",
          jest: "^29.5.0",
          "lint-staged": "^13.2.2",
          prettier: "^2.8.8",
          "ts-jest": "^29.1.0",
          tslib: "^2.5.3",
          tsup: "^7.0.0",
          turbo: "^1.10.5",
          typescript: "^5.1.3",
        },
      },
    }),

    packageScript({
      includeWorkspaceRoot: false,
      options: {
        scripts: {
          clean: "rm -rf lib dist tsconfig.tsbuildinfo",
          deepClean: "rm -rf lib dist tsconfig.tsbuildinfo",
          "check:prettier": { options: [undefined], fixValue: undefined },
          "check:jest": { options: [undefined], fixValue: undefined },
          "check:eslint": { options: [undefined], fixValue: undefined },
          "check:typescript": { options: [undefined], fixValue: undefined },
          "check-typescript": "tsc --build",
          prepublishOnly: "pnpm check-typescript && pnpm transpile-typescript",
          "dev-mode": "pnpm transpile-typescript --watch",
        },
      },
    }),

    standardTsconfig({
      options: {
        template: {
          extends: "../../tsconfig.base.json",
          compilerOptions: {
            outDir: "lib",
            rootDir: "src",
          },
          exclude: ["node_modules", "lib", "dist"],
        },
      },
    }),

    requireDependency({
      options: {
        devDependencies: {
          tslib: "^2.5.3",
          typescript: "^5.1.3",
          tsup: "^7.0.0",
        },
      },
    }),

    packageOrder({ includeWorkspaceRoot: true }),

    alphabeticalDependencies({
      includeWorkspaceRoot: true,
    }),

    alphabeticalScripts({
      includeWorkspaceRoot: true,
    }),
  ],
};

export default config;
