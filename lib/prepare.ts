import execa from "execa";
import fs from "fs/promises";
import { EOL } from "os";
import { Config, Context } from "semantic-release";
import { convertExecaResultToSemanticReleaseError } from "./helper";
import { UserConfig } from "./userConfig";

export const prepare = async (pluginConfig: Config & UserConfig, context: Context): Promise<void> => {
  try {
    const releaseName = `${process.env["RELEASE_NAME"] as string}@${context.nextRelease?.version as string}`;
    process.env["SENTRY_RELEASE_NAME"] = releaseName;
    await fs.appendFile("build.env", `SENTRY_RELEASE_NAME=${releaseName}${EOL}`);

    await execa("node_modules/.bin/sentry-cli", ["releases", "new", process.env["SENTRY_RELEASE_NAME"]], {
      stdio: "inherit",
    });
  } catch (err) {
    context.logger.error("fail", err);

    if (pluginConfig.allowSentryFailure) {
      context.logger.log(`Sentry verify failed, but this is allowed by config. Err: ${(err as Error).message}`);
      return;
    }

    throw convertExecaResultToSemanticReleaseError(err, "Failed to create Sentry release");
  }
};
