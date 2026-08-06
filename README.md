# Semantic Release Plugin for Sentry releases

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

A [Semantic Release](https://github.com/semantic-release/semantic-release) plugin that keeps
[Sentry](https://sentry.io/) releases in step with the versions Semantic Release publishes.

## What it does

Sentry needs to be told about a release before it can tell you anything useful about one: which
commits went into it, whether an error is a regression, which deploy first saw a crash. This plugin
does that bookkeeping as part of the normal release run, so there is no separate CI step to keep in
sync with the version number.

It hooks into four Semantic Release steps and drives the bundled
[Sentry CLI](https://docs.sentry.io/cli/):

| Step               | What happens                                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verifyConditions` | Checks the auth token, organisation and project are all resolvable, and that the Sentry CLI can reach the instance, before Semantic Release does any work. |
| `prepare`          | Creates the release and attaches the commits since the previous one, so Sentry can work out suspect commits.                                               |
| `publish`          | Uploads source maps, if you asked for them.                                                                                                                |
| `success`          | Finalizes the release, marking it as released.                                                                                                             |
| `fail`             | Deletes the releases that were created, so a failed run leaves nothing half-created behind.                                                                |

Releases are named `<packageName>@<version>`, which is the same form the Sentry SDKs derive by
default from your build metadata. If your application reports a different release name, set
`packageName` to match it, minding the [name limitations](https://docs.sentry.io/product/releases/naming-releases/)
Sentry documents.

The names are also exported so later CI steps can use them — see [Release name output](#release-name-output).

## Usage

Install the plugin and add it to your plugin list:

```sh
npm install --save-dev @droidsolutions-oss/semantic-release-sentry
```

```json
{
  "release": {
    "plugins": ["...", "@droidsolutions-oss/semantic-release-sentry"]
  }
}
```

The Sentry CLI is a native binary, delivered by `@sentry/cli` as a set of platform specific
`optionalDependencies`. Installing with optional dependencies disabled — `--no-optional`,
`--omit=optional` or `--ignore-optional` — leaves no binary for your platform, and the plugin has
nothing to run. `@sentry/cli` does have a postinstall script, but since version 3 it is only a
fallback that downloads the binary from the Sentry CDN when the optional dependency is missing;
`--ignore-scripts` on its own is harmless.

### Authentication

`SENTRY_AUTH_TOKEN` must be set in the environment. It is the one setting that cannot be given in
the plugin config.

Every other setting can come from either the plugin config or an environment variable. **The plugin
config always wins**, and the environment variable is the fallback:

| Setting         | Environment fallback                                |
| --------------- | --------------------------------------------------- |
| `sentryOrg`     | `SENTRY_ORG`                                        |
| `sentryProject` | `SENTRY_PROJECT`                                    |
| `sentryUrl`     | `SENTRY_URL`                                        |
| `packageName`   | `npm_package_name`, then the `name` in package.json |

## Configuration

### sentryOrg

Slug of the Sentry organisation the releases belong to. Required, unless `SENTRY_ORG` is set.

### sentryProject

Slug of the Sentry project a release belongs to. Required, unless `SENTRY_PROJECT` is set.

Pass an array to attach one release to several projects at once:

```json
{
  "sentryOrg": "my-org",
  "sentryProject": ["my-project-api", "my-project-admin"]
}
```

That creates a **single** release known to both projects — appropriate when the same build is
deployed to both. If your applications are separate artifacts that report separate release names,
you want [several releases](#releases) instead.

### sentryUrl

Base URL of a self hosted Sentry instance, for example `https://sentry.example.com`. When neither
this nor `SENTRY_URL` is set, the Sentry CLI falls back to its own default and to any `~/.sentryclirc`
present.

### packageName

Name of the release, without the version. Defaults to the `npm_package_name` environment variable,
and then to the `name` field of the package.json in the working directory.

### uploadSourceMaps

Off by default. Set it to `true` to upload source maps for the release, which is what makes
stack traces readable for JavaScript and TypeScript projects.

### sources

Directory the source maps are read from. Defaults to `dist`. Only used when `uploadSourceMaps` is
enabled.

### allowSentryFailure

Off by default. When set to `true`, every Sentry error is logged and swallowed instead of failing
the release.

Be aware of what this means: the release probably was not created and the source maps probably were
not uploaded. If a later stage of your pipeline relies on the Sentry release existing, make that
stage tolerant too.

The `fail` step ignores this setting and never fails the release, whatever it is set to. That step
only runs once the release has already failed, so an error there cannot change the outcome — it can
only push the error that actually caused the failure further down the log. Deletions that do not
work are logged and otherwise ignored.

### envFile

Path of the dotenv file the release names are appended to. Defaults to `build.env`. Set it to
`false` to write no file at all. See [Release name output](#release-name-output).

### releases

Manage several Sentry releases from a single Semantic Release run. Use this when one repository
builds several separately deployed applications, each reporting to its own Sentry project.

```json
{
  "release": {
    "plugins": [
      "...",
      [
        "@droidsolutions-oss/semantic-release-sentry",
        {
          "sentryOrg": "my-org",
          "releases": [
            { "packageName": "MyApp.Admin", "sentryProject": "my-project-admin" },
            { "packageName": "MyApp.Api", "sentryProject": "my-project-api" },
            { "packageName": "MyApp.Worker", "sentryProject": "my-project-worker" }
          ]
        }
      ]
    ]
  }
}
```

Every step then runs once per entry, so the example above creates, links, finalizes or deletes three
releases that share a version but not a name.

Each entry may set `packageName`, `sentryProject`, `uploadSourceMaps` and `sources`. Anything an
entry leaves out is inherited from the top level, so shared settings only need saying once:

```json
{
  "uploadSourceMaps": true,
  "sources": "dist",
  "releases": [
    { "packageName": "my-app-web", "sentryProject": "my-project-web" },
    { "packageName": "my-app-admin", "sentryProject": "my-project-admin", "sources": "admin/dist" }
  ]
}
```

`sentryOrg`, `sentryUrl`, `allowSentryFailure` and `envFile` are shared by every release and can only
be set at the top level.

When `releases` is omitted the top level settings describe a single release, which is how the plugin
has always behaved — existing configurations need no changes.

#### One release failing

Each step attempts every release rather than stopping at the first failure, then reports the
failures together. A typo in the third project slug therefore surfaces in the same run as one in the
first, instead of one CI run at a time.

## Release name output

The names of the releases that were created are published so later steps of your pipeline can
reference them, for example to set `SENTRY_RELEASE` on the container you are about to deploy.

A name is published as soon as its release exists in Sentry, not before, so what you read back is
what was actually created. A release that failed to be created is therefore absent, which is also
what stops the `fail` step from trying to delete releases that never existed.

They are written to three places:

- the environment of the running Semantic Release process
- the dotenv file named by [`envFile`](#envfile), `build.env` by default
- the file named by `GITHUB_ENV`, whenever one is present, so the values are available to later
  steps of a GitHub Actions job without any extra configuration

A single release uses the key `SENTRY_RELEASE_NAME`:

```sh
SENTRY_RELEASE_NAME=my-app@1.2.3
```

Several releases cannot share one key, so each is suffixed with its Sentry projects:

```sh
SENTRY_RELEASE_NAME_MY_PROJECT_API=MyApp.Api@1.2.3
SENTRY_RELEASE_NAME_MY_PROJECT_ADMIN=MyApp.Admin@1.2.3
SENTRY_RELEASE_NAME_MY_PROJECT_WORKER=MyApp.Worker@1.2.3
```
