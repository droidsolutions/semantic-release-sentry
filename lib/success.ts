import execa from "execa";
import { Config, SuccessContext } from "semantic-release";
import { convertExecaResultToSemanticReleaseError } from "./helper";
import { UserConfig } from "./userConfig";

export const success = async (pluginConfig: Config & UserConfig, context: SuccessContext): Promise<void> => {
  try {
    await execa(
      "node_modules/.bin/sentry-cli",
      ["releases", "finalize", process.env["SENTRY_RELEASE_NAME"] as string],
      {
        stdio: "inherit",
      },
    );
  } catch (err) {
    context.logger.error("fail", err);

    if (pluginConfig.allowSentryFailure) {
      context.logger.log(
        `Sentry success/finalize failed, but this is allowed by config. Err: ${(err as Error).message}`,
      );
      return;
    }

    throw convertExecaResultToSemanticReleaseError(err, "Failed to finalize Sentry release.");
  }
};
