import { execa } from "execa";
import { PublishContext } from "semantic-release";
import { getSentryCliPath } from "./helper.mjs";
import { runForEachTarget } from "./runTargets.mjs";
import { loadTargets, releaseName, resolveOrg, targetArgs } from "./targets.mjs";
import { UserConfig } from "./userConfig.mjs";

export const publish = async (pluginConfig: UserConfig, context: PublishContext): Promise<void> => {
  const version = context.nextRelease.version;
  const targets = (await loadTargets(pluginConfig, context.logger)).filter((target) => target.uploadSourceMaps);
  const org = resolveOrg(pluginConfig);

  await runForEachTarget(
    targets,
    {
      allowSentryFailure: pluginConfig.allowSentryFailure ?? false,
      logger: context.logger,
      message: "Failed to upload source maps",
    },
    async (target) => {
      const name = releaseName(target, version);

      context.logger.log(`Uploading source maps from ${target.sources} for Sentry release ${name}.`);
      await execa(
        getSentryCliPath(),
        ["sourcemaps", "upload", "--release", name, target.sources, ...targetArgs(org, target)],
        { stdio: "inherit" },
      );
    },
  );
};
