declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      /** Base URL of the Sentry instance, for self hosted installations. */
      SENTRY_URL: string | undefined;

      /** Token the Sentry CLI authenticates with. The only setting that must come from the environment. */
      SENTRY_AUTH_TOKEN: string | undefined;

      /** Fallback for the `sentryOrg` setting. */
      SENTRY_ORG: string | undefined;

      /** Fallback for the `sentryProject` setting. Can only ever name a single project. */
      SENTRY_PROJECT: string | undefined;

      /**
       * Name of the release that was created, exported for later pipeline steps. Only set when a
       * single release is managed; several releases get one suffixed variable each.
       */
      SENTRY_RELEASE_NAME: string | undefined;

      /** Fallback for the `packageName` setting, set by npm when it runs a script. */
      npm_package_name: string | undefined;

      /** File the GitHub Actions runner reads environment variables for later steps from. */
      GITHUB_ENV: string | undefined;
    }
  }
}

export {};
