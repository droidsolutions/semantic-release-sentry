const execa = require("execa");

module.exports = async (pluginConfig, context) => {
  try {
    await execa(
      "node_modules/.bin/sentry-cli",
      ["releases", "set-commits", process.env.SENTRY_RELEASE_NAME, "--auto"],
      { stdio: "inherit" },
    );
    if (pluginConfig.skipUploadSourceMaps) {
      context.logger.log("Skipping source map upload.");
    } else {
      await execa(
        "node_modules/.bin/sentry-cli",
        [
          "releases",
          "files",
          process.env.SENTRY_RELEASE_NAME,
          "upload-sourcemaps",
          pluginConfig.sources || "dist",
          "--rewrite",
        ],
        { stdio: "inherit" },
      );
    }
  } catch (err) {
    throw new Error(`Unable to use Sentry CLI: ${err.message}`);
  }
};
