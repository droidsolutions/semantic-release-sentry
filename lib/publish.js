const execa = require("execa");

module.exports = async (pluginConfig, context) => {
  try {
    await execa(
      "node_modules/.bin/sentry-cli",
      ["releases", "set-commits", "--auto", process.env.SENTRY_RELEASE_NAME],
      { stdio: "inherit" },
    );
    if (pluginConfig.uploadSourceMaps) {
      await execa(
        "node_modules/.bin/sentry-cli",
        [
          "releases",
          "files",
          process.env.SENTRY_RELEASE_NAME,
          "upload-sourcemaps",
          pluginConfig.sources || "dist",
          "--rewrite",
          "--no-sourcemap-reference",
        ],
        { stdio: "inherit" },
      );
    }
  } catch (err) {
    throw new Error(`Unable to use Sentry CLI: ${err.message}`);
  }
};
