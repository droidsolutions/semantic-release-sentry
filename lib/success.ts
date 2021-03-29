import execa from "execa";
import { Config, Context } from "semantic-release";
import { UserConfig } from "./userConfig";

export const success = async (pluginConfig: Config & UserConfig, context: Context): Promise<void> => {
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
    throw new Error(`Unable to use Sentry CLI: ${(err as Error).message}`);
  }
};
