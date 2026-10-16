import { execa } from "execa";
import { VerifyConditionsContext } from "semantic-release";
import { getSentryCliPath } from "./helper.mjs";
import { loadTargets, resolveOrg } from "./targets.mjs";
import { UserConfig } from "./userConfig.mjs";
import "./processEnv.mjs";

export const verify = async (pluginConfig: UserConfig, context: VerifyConditionsContext): Promise<void> => {
  const errors: Error[] = [];

  if (!process.env.SENTRY_AUTH_TOKEN) {
    errors.push(new Error("Environment variable SENTRY_AUTH_TOKEN is not set!"));
  }

  if (!resolveOrg(pluginConfig)) {
    errors.push(
      new Error(
        "No Sentry organisation is set, either set it via sentryOrg config or SENTRY_ORG environment variable.",
      ),
    );
  }

  // Only export a URL that was actually asked for. Without one the Sentry CLI falls back to its own
  // default and to any ~/.sentryclirc the user may have.
  const sentryUrl = pluginConfig.sentryUrl ?? process.env.SENTRY_URL;
  if (sentryUrl) {
    process.env.SENTRY_URL = sentryUrl;
  }

  const targets = await loadTargets(pluginConfig, context.logger);

  for (const target of targets) {
    if (target.sentryProjects.length === 0) {
      errors.push(
        new Error(
          `No Sentry project is set for release ${target.packageName ?? "<unnamed>"}, either set it via ` +
            "sentryProject config or SENTRY_PROJECT environment variable.",
        ),
      );
    }

    if (!target.packageName) {
      errors.push(
        new Error(
          `No release name could be resolved for project ${target.sentryProjects.join(", ")}, set it via ` +
            "packageName config.",
        ),
      );
    }
  }

  try {
    await execa(getSentryCliPath(), ["info"], { stdio: "inherit" });
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
