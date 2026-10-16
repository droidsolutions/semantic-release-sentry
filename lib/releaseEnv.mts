import fs from "node:fs/promises";
import { EOL } from "node:os";
import { requirePackageName } from "./targets.mjs";
import { ReleaseTarget } from "./userConfig.mjs";

const BASE_KEY = "SENTRY_RELEASE_NAME";
const RELEASES_KEY = "SENTRY_RELEASES";

const toEnvKeySuffix = (target: ReleaseTarget): string =>
  requirePackageName(target)
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

/**
 * Builds the environment key that tells later CI steps about one release.
 *
 * The suffix comes from the package name rather than the Sentry project because that is what actually distinguishes one
 * release from another. Several releases may well live in a single project, and keying those by project would give them
 * all the same name, of which only the last would survive into the pipeline.
 *
 * @param target The release to build the key for.
 * @param suffixed Whether the key is suffixed at all, which the `releases` array opts into. It is deliberately not
 * derived from how many releases there are, so adding a release never renames the keys of the ones already configured.
 * @returns The environment variable name to publish the release under.
 * @throws Error If the release has no package name to build the suffix from.
 */
export const releaseEnvKey = (target: ReleaseTarget, suffixed: boolean): string =>
  suffixed ? `${BASE_KEY}_${toEnvKeySuffix(target)}` : BASE_KEY;

/**
 * Checks that no two releases would be published under the same environment key.
 *
 * Writing them anyway loses every release but the last, quietly and only in the pipeline, so this runs before the first
 * release is created rather than letting the run half succeed.
 *
 * @param targets Every configured release.
 * @param suffixed Whether the keys are suffixed, as passed to {@link releaseEnvKey}.
 * @throws Error If two releases resolve to the same key.
 */
export const assertUniqueEnvKeys = (targets: ReleaseTarget[], suffixed: boolean): void => {
  const owners = new Map<string, string>();

  for (const target of targets) {
    const key = releaseEnvKey(target, suffixed);
    const owner = owners.get(key);

    if (owner !== undefined) {
      throw new Error(
        `Releases ${owner} and ${requirePackageName(target)} would both be exported as ${key}, give each release its own packageName.`,
      );
    }

    owners.set(key, requirePackageName(target));
  }
};

/**
 * Builds the entry that carries every release name in one variable.
 *
 * Steps that act on all releases at once, such as reporting a deployment, would otherwise have to discover the
 * individual keys by prefix.
 *
 * @param names The release names to publish, usually only those that were actually created.
 * @returns The key and its semicolon separated value.
 */
export const releasesEnvEntry = (names: string[]): [string, string] => [RELEASES_KEY, names.join(";")];

/**
 * Reads back the release names a previous step exported.
 *
 * The fail step is the only one Semantic Release calls without a `nextRelease`, so it cannot work
 * out the names itself and has to rely on what prepare left behind. The aggregate key is not prefixed with the base
 * key, so it is not picked up here and no release is deleted twice.
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
