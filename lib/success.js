const execa = require("execa");

module.exports = async (pluginConfig, context) => {
  try {
    await execa("node_modules/.bin/sentry-cli", ["releases", "finalize", process.env.SENTRY_RELEASE_NAME], {
      stdio: "inherit",
    });
  } catch (err) {
    context.logger.error("fail", err);

    if (pluginConfig.allowSentryFailure) {
      context.logger.log(`Sentry success/finalize failed, but this is allowed by config. Err: ${err.message}`);
      return;
    }
    throw new Error(`Unable to use Sentry CLI: ${err.message}`);
  }
};
