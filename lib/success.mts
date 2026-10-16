import { execa } from "execa";
import { SuccessContext } from "semantic-release";
import { getSentryCliPath } from "./helper.mjs";
import { runForEachTarget } from "./runTargets.mjs";
import { loadTargets, releaseName, resolveOrg, targetArgs } from "./targets.mjs";
import { UserConfig } from "./userConfig.mjs";

export const success = async (pluginConfig: UserConfig, context: SuccessContext): Promise<void> => {
  const version = context.nextRelease.version;
  const targets = await loadTargets(pluginConfig, context.logger);
  const org = resolveOrg(pluginConfig);

  await runForEachTarget(
    targets,
    {
      allowSentryFailure: pluginConfig.allowSentryFailure ?? false,
      logger: context.logger,
      message: "Failed to finalize Sentry release",
    },
    async (target) => {
      const name = releaseName(target, version);

      context.logger.log(`Finalizing Sentry release ${name}.`);
      await execa(getSentryCliPath(), ["releases", "finalize", name, ...targetArgs(org, target)], {
        stdio: "inherit",
      });
    },
  );
};
