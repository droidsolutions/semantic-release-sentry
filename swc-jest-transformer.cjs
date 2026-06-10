// @swc-node/jest (1.9.1, latest) only transforms files matching
// /\.(tsx?|jsx?|mjs)$/, so .mts source files pass through untransformed and
// Jest fails. This shim delegates to it but presents .mts/.cts paths as
// .ts/.cts so swc compiles them; module resolution is unaffected because Jest
// resolves the real path before calling the transformer.
const swcTransformer = require("@swc-node/jest");

module.exports = {
  ...swcTransformer,
  process(src, filename, options) {
    return swcTransformer.process(src, filename.replace(/\.mts$/, ".ts").replace(/\.cts$/, ".ts"), options);
  },
};
