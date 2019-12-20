const execa = require("execa");

module.exports = async (pluginConfig, context) => {
  try {
    process.env.SENTRY_RELEASE_NAME = `${process.env.RELEASE_NAME}@${nextRelease.version}`;
    await execa("node_modules/.bin/sentry-cli", ["releases", "new", process.env.SENTRY_RELEASE_NAME], {
      stdio: "inherit",
    });
  } catch (err) {
    throw new Error(`Unable to use Sentry CLI: ${error.message}`);
  }
};
