const execa = require("execa");

module.exports = async (pluginConfig, context) => {
  try {
    await execa("node_modules/.bin/sentry-cli", ["releases", "delete", process.env.SENTRY_RELEASE_NAME], {
      stdio: "inherit",
    });
  } catch (err) {
    throw new Error(`Unable to use Sentry CLI: ${err.message}`);
  }
};
