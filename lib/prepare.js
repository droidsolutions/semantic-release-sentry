const execa = require("execa");

module.exports = async (pluginConfig, context) => {
  try {
    process.env.SENTRY_RELEASE_NAME = `${process.env.RELEASE_NAME}@${context.nextRelease.version}`;
    await execa("node_modules/.bin/sentry-cli", ["releases", "new", process.env.SENTRY_RELEASE_NAME], {
      stdio: "inherit",
    });
  } catch (err) {
    if (pluginConfig.allowSentryFailure) {
      context.logger.log(`Sentry verify failed, but this is allowed by config. Err: ${err.message}`);
      return;
    }
    throw new Error(`Unable to use Sentry CLI: ${err.message}`);
  }
};
