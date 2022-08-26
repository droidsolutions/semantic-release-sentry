import execa from "execa";
import path from "path";
import { Config, Context } from "semantic-release";
import { UserConfig } from "./userConfig";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      SENTRY_URL: string | undefined;
      SENTRY_AUTH_TOKEN: string | undefined;
    }
  }
}

export const verify = async (pluginConfig: Config & UserConfig, context: Context): Promise<void> => {
  const errors = [];
  for (const envVar of ["SENTRY_AUTH_TOKEN"]) {
    if (!process.env[envVar]) {
      errors.push(new Error(`Environment variable ${envVar} is not set!`));
    }
  }

  const sentryProject: string | undefined = pluginConfig.sentryProject ?? process.env["SENTRY_PROJECT"];
  if (!sentryProject) {
    errors.push(
      new Error(
        "No Sentry project is set, either set it via sentryProject config or SENTRY_PROJECT environment variable.",
      ),
    );
  }

  const sentryOrg: string | undefined = pluginConfig.sentryOrg ?? process.env["SENTRY_ORG"];
  if (!sentryOrg) {
    errors.push(
      new Error(
        "No Sentry organisation is set, either set it via sentryOrg config or SENTRY_ORG environment variable.",
      ),
    );
  }

  const sentryUrl: string | undefined = process.env.SENTRY_URL ?? pluginConfig.sentryUrl ?? "https://sentry.io.";

  // set Sentry url for CLI
  process.env.SENTRY_URL = sentryUrl;

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
    context.logger.error('Error running "sentry-cli info".', err);
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
