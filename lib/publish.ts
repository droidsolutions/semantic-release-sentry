// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const SemanticReleaseError = require("@semantic-release/error");
import execa from "execa";
import { Config, Context } from "semantic-release";
import { UserConfig } from "./userConfig";

export const publish = async (pluginConfig: Config & UserConfig, context: Context): Promise<void> => {
  try {
    await execa(
      "node_modules/.bin/sentry-cli",
      ["releases", "set-commits", process.env["SENTRY_RELEASE_NAME"] as string, "--auto"],
      { stdio: "inherit" },
    );
    if (pluginConfig.uploadSourceMaps) {
      context.logger.log("Uploading source maps.");
      await execa(
        "node_modules/.bin/sentry-cli",
        [
          "releases",
          "files",
          process.env["SENTRY_RELEASE_NAME"] as string,
          "upload-sourcemaps",
          pluginConfig.sources || "dist",
          "--rewrite",
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    throw new SemanticReleaseError(`Unable to use Sentry CLI: ${(err as Error).message}`, "ESENTRYCLIFAILURE", err);
  }
};
