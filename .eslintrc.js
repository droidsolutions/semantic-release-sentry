module.exports = {
  root: true,
  parserOptions: {
    tsConfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
  extends: ["@droidsolutions/eslint-config-droid"],
  rules: {
    "dot-notation": "off",
    "node/no-extraneous-import": [
      "error",
      {
        allowModules: ["aggregate-error"],
      },
    ],
    "node/no-extraneous-require": [
      "error",
      {
        allowModules: ["@semantic-release/error"],
      },
    ],
  },
};
