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
        ],
        { stdio: "inherit" },
      );
    } else {
      context.logger.log("Skipping source map upload.");
    }
  } catch (err) {
    throw new Error(`Unable to use Sentry CLI: ${err.message}`);
  }
};
