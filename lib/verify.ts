import AggregateError from "aggregate-error";
import execa from "execa";
import path from "path";
import { Config, Context } from "semantic-release";
import { UserConfig } from "./userConfig";

export const verify = async (pluginConfig: Config & UserConfig, context: Context): Promise<void> => {
  const errors = [];
  for (const envVar of ["SENTRY_PROJECT", "SENTRY_ORG", "SENTRY_URL", "SENTRY_AUTH_TOKEN"]) {
    if (!process.env[envVar]) {
      errors.push(new Error(`Environment variable ${envVar} is not set!`));
    }
  }

  let packageName = pluginConfig.packageName || process.env["npm_package_name"];
  if (!packageName) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pjson = require(path.resolve("package.json")) as { name: string };
    context.logger.log(`reading package name ${pjson.name} from package.json`);
    packageName = pjson.name;
  }

  process.env["RELEASE_NAME"] = packageName;

  try {
    await execa("node_modules/.bin/sentry-cli", ["info"], { stdio: "inherit" });
  } catch (err) {
    context.logger.error(`Error running "sentry-cli info".`, err);
    errors.push(new Error(`Unable to use Sentry CLI: ${(err as Error).message}`));
  }

  if (errors.length > 0) {
    if (pluginConfig.allowSentryFailure) {
      context.logger.log(
        `Sentry verify failed, but this is allowed by config. Err: ${errors.map((e) => e.message).join(";")}`,
      );
      return;
    }
    throw new AggregateError(errors);
  }
};
