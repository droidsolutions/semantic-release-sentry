import execa from "execa";
import { Config, Context } from "semantic-release";
import { convertExecaResultToSemanticReleaseError } from "./helper";
import { UserConfig } from "./userConfig";

export const publish = async (pluginConfig: Config & UserConfig, context: Context): Promise<void> => {
  try {
    if (pluginConfig.uploadSourceMaps) {
      context.logger.log("Uploading source maps.");
      await execa(
        "node_modules/.bin/sentry-cli",
        [
          "sourcemaps",
          "upload",
          "--release",
          process.env["SENTRY_RELEASE_NAME"] as string,
          pluginConfig.sources || "dist",
        ],
        { stdio: "inherit" },
      );
    }
  } catch (err) {
    context.logger.error("fail", err);

    if (pluginConfig.allowSentryFailure) {
      context.logger.log(`Sentry publish failed, but this is allowed by config. Err: ${(err as Error).message}`);
      return;
    }

    throw convertExecaResultToSemanticReleaseError(err, "Failed to publish Sentry release.");
  }
};
