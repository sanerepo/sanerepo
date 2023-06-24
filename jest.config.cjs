/** @type {import('ts-jest').JestConfigWithTsJest} */
const tsJestBase = {
    preset: "ts-jest/presets/default-esm",
  };
  
  const swcBase = {
    transform: {
      "^.+\\.(t|j)sx?$": [
        "@swc/jest",
        {
          sourceMaps: "inline",
        },
      ],
    },
    extensionsToTreatAsEsm: [".ts", ".tsx"],
  };
  
  /** @type {import('ts-jest').JestConfigWithTsJest} */
  const baseConfig = {
    ...(true ? swcBase : tsJestBase),
  
    testMatch: ["<rootDir>/src/**/?(*.)+(spec|test).[t]s?(x)"],
    testPathIgnorePatterns: ["node_modules", "lib"],
    watchPathIgnorePatterns: ["lib", "log"],
  
    moduleNameMapper: {
      "^(\\.{1,2}/.*)\\.js$": "$1",
    },
  
    cache: false,
  };
  
  /** @type {import('ts-jest').JestConfigWithTsJest} */
  module.exports = {
    ...baseConfig,
  
    projects: [
      "eslint-config", "mrl"
    ].map((displayName) => [
      {
        ...baseConfig,
        displayName,
        rootDir: `<rootDir>/packages/${displayName}`,
      },
    ]),
  };