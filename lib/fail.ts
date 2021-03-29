import execa from "execa";
import { Config, Context } from "semantic-release";
import { UserConfig } from "./userConfig";
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const SemanticReleaseError = require("@semantic-release/error");

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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    throw new SemanticReleaseError(`Unable to use Sentry CLI: ${(err as Error).message}`, "ESENTRYCLIFAILURE", err);
  }
};
