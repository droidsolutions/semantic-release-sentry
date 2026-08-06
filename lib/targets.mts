import fs from "node:fs/promises";
import path from "node:path";
import { ReleaseConfig, ReleaseTarget, UserConfig } from "./userConfig.mjs";

/** Fallbacks for settings the plugin config may leave out, resolved from the environment. */
export interface TargetDefaults {
  packageName?: string;
  sentryProject?: string;
}

const toProjectList = (project: string | string[] | undefined): string[] => {
  if (project === undefined) {
    return [];
  }

  return Array.isArray(project) ? project : [project];
};

/**
 * Resolves the plugin config into the list of releases to manage.
 *
 * Without a `releases` array the top level settings describe a single release, which is what every
 * config written before multi release support looked like. With one, each entry inherits the top
 * level settings and may override them individually.
 *
 * @param pluginConfig The plugin config as given by the user.
 * @param defaults Fallbacks for settings the config leaves out.
 * @returns One fully resolved target per release, with every default applied.
 */
export const resolveTargets = (pluginConfig: UserConfig, defaults: TargetDefaults): ReleaseTarget[] => {
  const configs: ReleaseConfig[] = pluginConfig.releases ?? [pluginConfig];

  return configs.map((config) => ({
    packageName: config.packageName ?? pluginConfig.packageName ?? defaults.packageName,
    sentryProjects: toProjectList(config.sentryProject ?? pluginConfig.sentryProject ?? defaults.sentryProject),
    uploadSourceMaps: config.uploadSourceMaps ?? pluginConfig.uploadSourceMaps ?? false,
    sources: config.sources ?? pluginConfig.sources ?? "dist",
  }));
};

/**
 * Resolves the releases to manage, reading the package name from package.json if needed.
 *
 * Every lifecycle step calls this rather than passing state between steps, so each one derives the
 * same releases from the same config on its own.
 *
 * @param pluginConfig The plugin config as given by the user.
 * @param logger Optional logger, told when the package name had to come from package.json.
 * @returns One fully resolved target per release.
 */
export const loadTargets = async (
  pluginConfig: UserConfig,
  logger?: { log: (message: string) => void },
): Promise<ReleaseTarget[]> => {
  const defaults: TargetDefaults = {
    packageName: process.env["npm_package_name"],
    sentryProject: process.env["SENTRY_PROJECT"],
  };

  const targets = resolveTargets(pluginConfig, defaults);
  if (targets.every((target) => target.packageName !== undefined)) {
    return targets;
  }

  // Only pay for reading package.json when a release actually needs a name from it.
  const pjson = JSON.parse(await fs.readFile(path.resolve("package.json"), "utf8")) as { name: string };
  logger?.log(`reading package name ${pjson.name} from package.json`);

  return resolveTargets(pluginConfig, { ...defaults, packageName: pjson.name });
};

/**
 * Resolves the Sentry organisation, preferring the plugin config over the environment.
 *
 * @param pluginConfig The plugin config as given by the user.
 * @returns The organisation slug, or `undefined` when neither source supplies one.
 */
export const resolveOrg = (pluginConfig: UserConfig): string | undefined =>
  pluginConfig.sentryOrg ?? process.env["SENTRY_ORG"];

/**
 * Builds the name the release is known by in Sentry.
 *
 * @param target The release to name.
 * @param version The version Semantic Release is about to publish.
 * @returns The release name, in the `name@version` form Sentry SDKs use by default.
 * @throws Error If no package name could be resolved. Creating a release literally called
 * `undefined@1.2.3` is worse than failing, and allowSentryFailure can carry a run this far.
 */
export const releaseName = (target: ReleaseTarget, version: string): string => {
  if (!target.packageName) {
    throw new Error(
      `No release name could be resolved for project ${target.sentryProjects.join(", ")}, set it via packageName config.`,
    );
  }

  return `${target.packageName}@${version}`;
};

/**
 * Builds the CLI flags that point a command at the right organisation and project.
 *
 * These are passed explicitly rather than through `SENTRY_ORG` and `SENTRY_PROJECT` because the
 * environment can only ever carry a single project, while a release may span several.
 *
 * @param org The Sentry organisation slug, if one is known.
 * @param target The release the command acts on.
 * @returns The flags to append to the Sentry CLI arguments.
 */
export const targetArgs = (org: string | undefined, target: ReleaseTarget): string[] => [
  ...(org === undefined ? [] : ["-o", org]),
  ...target.sentryProjects.flatMap((project) => ["-p", project]),
];
