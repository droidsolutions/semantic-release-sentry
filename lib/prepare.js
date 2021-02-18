const execa = require("execa");
const fs = require("fs").promises;
const { EOL } = require("os");

module.exports = async (pluginConfig, context) => {
  try {
    const releaseName = `${process.env.RELEASE_NAME}@${context.nextRelease.version}`;
    process.env.SENTRY_RELEASE_NAME = releaseName;
    await fs.appendFile("build.env", `SENTRY_RELEASE_NAME=${releaseName}${EOL}`);

    await execa("node_modules/.bin/sentry-cli", ["releases", "new", process.env.SENTRY_RELEASE_NAME], {
      stdio: "inherit",
    });
  } catch (err) {
    context.logger.error("fail", err);

    if (pluginConfig.allowSentryFailure) {
      context.logger.log(`Sentry verify failed, but this is allowed by config. Err: ${err.message}`);
      return;
    }
    throw new Error(`Unable to use Sentry CLI: ${err.message}`);
  }
};
