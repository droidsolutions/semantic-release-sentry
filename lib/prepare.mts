import { execa } from "execa";
import { PrepareContext } from "semantic-release";
import { getSentryCliPath } from "./helper.mjs";
import { releaseEnvKey, writeReleaseEnv } from "./releaseEnv.mjs";
import { runForEachTarget } from "./runTargets.mjs";
import { loadTargets, releaseName, resolveOrg, targetArgs } from "./targets.mjs";
import { UserConfig } from "./userConfig.mjs";

export const prepare = async (pluginConfig: UserConfig, context: PrepareContext): Promise<void> => {
  const version = context.nextRelease.version;
  const targets = await loadTargets(pluginConfig, context.logger);
  const org = resolveOrg(pluginConfig);

  await runForEachTarget(
    targets,
    {
      allowSentryFailure: pluginConfig.allowSentryFailure ?? false,
      logger: context.logger,
      message: "Failed to create Sentry release",
    },
    async (target) => {
      const name = releaseName(target, version);
      const args = targetArgs(org, target);

      context.logger.log(`Creating Sentry release ${name} for project ${target.sentryProjects.join(", ")}.`);
      await execa(getSentryCliPath(), ["releases", "new", name, ...args], { stdio: "inherit" });

      // Only now that the release exists, so the fail step never tries to delete one that does not.
      await writeReleaseEnv([[releaseEnvKey(targets, target), name]], pluginConfig.envFile ?? "build.env");

      context.logger.log(`Assigning commits to Sentry release ${name}.`);
      await execa(getSentryCliPath(), ["releases", "set-commits", name, "--auto", ...args], { stdio: "inherit" });
    },
  );
};
