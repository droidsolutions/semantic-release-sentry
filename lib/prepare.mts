import { execa } from "execa";
import { PrepareContext } from "semantic-release";
import { getSentryCliPath } from "./helper.mjs";
import { assertUniqueEnvKeys, releaseEnvKey, releasesEnvEntry, writeReleaseEnv } from "./releaseEnv.mjs";
import { runForEachTarget } from "./runTargets.mjs";
import { loadTargets, releaseName, resolveOrg, targetArgs } from "./targets.mjs";
import { UserConfig } from "./userConfig.mjs";

export const prepare = async (pluginConfig: UserConfig, context: PrepareContext): Promise<void> => {
  const version = context.nextRelease.version;
  const targets = await loadTargets(pluginConfig, context.logger);
  const org = resolveOrg(pluginConfig);
  const envFile = pluginConfig.envFile ?? "build.env";
  // Using the array form at all is what opts into suffixed keys, rather than how many entries it holds, so a second
  // release can be added later without renaming the key of the first.
  const suffixed = pluginConfig.releases !== undefined;

  // Before anything is created, so a config that would lose a release fails without leaving half a release behind.
  assertUniqueEnvKeys(targets, suffixed);

  const created: string[] = [];

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
      await writeReleaseEnv([[releaseEnvKey(target, suffixed), name]], envFile);
      created.push(name);

      context.logger.log(`Assigning commits to Sentry release ${name}.`);
      await execa(getSentryCliPath(), ["releases", "set-commits", name, "--auto", ...args], { stdio: "inherit" });
    },
  );

  // Written once the outcome of every release is known, so it never promises a release that failed.
  if (created.length > 0) {
    await writeReleaseEnv([releasesEnvEntry(created)], envFile);
  }
};
