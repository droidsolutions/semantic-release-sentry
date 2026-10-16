import { execa } from "execa";
import { FailContext } from "semantic-release";
import { getSentryCliPath } from "./helper.mjs";
import { exportedReleaseNames } from "./releaseEnv.mjs";
import { runForEach } from "./runTargets.mjs";
import { resolveOrg } from "./targets.mjs";
import { UserConfig } from "./userConfig.mjs";

export const fail = async (pluginConfig: UserConfig, context: FailContext): Promise<void> => {
  // Unlike every other step this one gets no nextRelease, so the names have to come back out of the
  // environment prepare exported them into. Deleting is organisation scoped, so no project is needed.
  const names = exportedReleaseNames();
  const org = resolveOrg(pluginConfig);
  const orgArgs = org === undefined ? [] : ["-o", org];

  await runForEach(
    names,
    {
      // Cleanup on an already failed run. Rethrowing here cannot change the outcome, and Semantic
      // Release logs the fail step before the error that caused the failure, so an unreachable
      // Sentry would only push the real cause further up the log.
      allowSentryFailure: true,
      ignoreReason: "the release has already failed",
      logger: context.logger,
      message: "Failed to delete Sentry release",
      describe: (name) => `release ${name}`,
    },
    async (name) => {
      context.logger.log(`Deleting Sentry release ${name}.`);
      await execa(getSentryCliPath(), ["releases", "delete", name, ...orgArgs], { stdio: "inherit" });
    },
  );
};
