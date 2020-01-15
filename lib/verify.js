const execa = require("execa");
const AggregateError = require("aggregate-error");
const path = require("path");

module.exports = async (pluginConfig, { logger }) => {
  const errors = [];
  for (const envVar of ["SENTRY_PROJECT", "SENTRY_ORG", "SENTRY_URL", "SENTRY_AUTH_TOKEN"]) {
    if (!process.env[envVar]) {
      errors.push(new Error(`Environment variable ${envVar} is not set!`));
    }
  }

  let packageName = pluginConfig.packageName || process.env.npm_package_name;
  if (!packageName) {
    let pjson = require(path.resolve("package.json"));
    logger.log(`reading package name ${pjson.name} from package.json`);
    packageName = pjson.name;
  }

  process.env.RELEASE_NAME = packageName;

  try {
    await execa("node_modules/.bin/sentry-cli", ["info"], { stdio: "inherit" });
  } catch (err) {
    errors.push(new Error(`Unable to use Sentry CLI: ${err.message}`));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
};
