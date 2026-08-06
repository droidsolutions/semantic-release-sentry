import fs from "node:fs/promises";
import { EOL } from "node:os";
import { ReleaseTarget } from "./userConfig.mjs";

const BASE_KEY = "SENTRY_RELEASE_NAME";

const toEnvKeySuffix = (target: ReleaseTarget): string =>
  target.sentryProjects
    .join("_")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toUpperCase();

/**
 * Builds the environment key that tells later CI steps about one release.
 *
 * A single release keeps the bare `SENTRY_RELEASE_NAME` key it has always used, so pipelines
 * written against earlier versions of this plugin keep working untouched. Several releases cannot
 * share one key, so each is suffixed with its Sentry projects.
 *
 * @param targets Every configured release, which decides whether keys are suffixed at all. It is
 * deliberately not the list of releases that succeeded, so one failing release never silently
 * changes the keys the rest of the pipeline reads.
 * @param target The release to build the key for.
 * @returns The environment variable name to publish the release under.
 */
export const releaseEnvKey = (targets: ReleaseTarget[], target: ReleaseTarget): string =>
  targets.length === 1 ? BASE_KEY : `${BASE_KEY}_${toEnvKeySuffix(target)}`;

/**
 * Reads back the release names a previous step exported.
 *
 * The fail step is the only one Semantic Release calls without a `nextRelease`, so it cannot work
 * out the names itself and has to rely on what prepare left behind.
 *
 * @returns Every exported release name, empty when no release was created.
 */
export const exportedReleaseNames = (): string[] =>
  Object.entries(process.env)
    .filter(([key, value]) => key.startsWith(BASE_KEY) && value)
    .map(([, value]) => value as string);

/**
 * Publishes the release names so later steps of the pipeline can pick them up.
 *
 * They are exported into the current process, appended to the dotenv file when one is configured,
 * and appended to the GitHub Actions environment file whenever the runner provides one.
 *
 * @param entries The keys and values to publish.
 * @param envFile Path of the dotenv file to append to, or `false` to write none.
 */
export const writeReleaseEnv = async (entries: [string, string][], envFile: string | false): Promise<void> => {
  for (const [key, value] of entries) {
    process.env[key] = value;
  }

  const contents = entries.map(([key, value]) => `${key}=${value}${EOL}`).join("");

  if (envFile) {
    await fs.appendFile(envFile, contents);
  }

  const githubEnv = process.env["GITHUB_ENV"];
  if (githubEnv) {
    await fs.appendFile(githubEnv, contents);
  }
};
