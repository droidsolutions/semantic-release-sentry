import execa from "execa";
import { Config, Context } from "semantic-release";
import { convertExecaResultToSemanticReleaseError } from "./helper";
import { UserConfig } from "./userConfig";

export const fail = async (pluginConfig: Config & UserConfig, context: Context): Promise<void> => {
  try {
    await execa("node_modules/.bin/sentry-cli", ["releases", "delete", process.env["SENTRY_RELEASE_NAME"] as string], {
      stdio: "inherit",
    });
  } catch (err) {
    context.logger.error("fail", err);

    if (pluginConfig.allowSentryFailure) {
      context.logger.log(`Sentry publish failed, but this is allowed by config. Err: ${(err as Error).message}`);
      return;
    }

    throw convertExecaResultToSemanticReleaseError(err, "Failed to delete Sentry release.");
  }
};

