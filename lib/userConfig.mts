/**
 * Settings that describe a single Sentry release. They can be given at the top level of the plugin
 * config, in which case the plugin manages exactly one release, or repeated inside
 * {@link UserConfig.releases} to manage several releases from a single Semantic Release run.
 */
export interface ReleaseConfig {
  /**
   * Name of the release, without the version. Defaults to the `npm_package_name` environment
   * variable, or the `name` field of the package.json in the current working directory.
   */
  packageName?: string;

  /**
   * Slug of the Sentry project the release belongs to. Pass an array to attach one release to
   * several projects at once.
   */
  sentryProject?: string | string[];

  /** Whether source maps should be uploaded for this release. Defaults to `false`. */
  uploadSourceMaps?: boolean;

  /** Directory the source maps are read from. Defaults to `dist`. */
  sources?: string;
}

export interface UserConfig extends ReleaseConfig {
  /** Swallow every Sentry error instead of failing the release. Defaults to `false`. */
  allowSentryFailure?: boolean;

  /** Slug of the Sentry organisation. Falls back to the `SENTRY_ORG` environment variable. */
  sentryOrg?: string;

  /**
   * Base URL of the Sentry instance, for self hosted installations. Falls back to the `SENTRY_URL`
   * environment variable. When neither is given the Sentry CLI default applies.
   */
  sentryUrl?: string;

  /**
   * Path of the dotenv file the resolved release names are appended to, so later CI steps can pick
   * them up. Defaults to `build.env`. Set to `false` to disable writing the file.
   */
  envFile?: string | false;

  /**
   * Manage more than one Sentry release in a single run. Each entry may override the release
   * settings from the top level. When omitted, the top level settings describe a single release.
   */
  releases?: ReleaseConfig[];
}

/** A fully resolved release, with every default applied. */
export interface ReleaseTarget {
  /** Name of the release without the version, or `undefined` when it could not be resolved. */
  packageName: string | undefined;

  /** Every Sentry project this release is attached to. */
  sentryProjects: string[];

  uploadSourceMaps: boolean;

  sources: string;
}
