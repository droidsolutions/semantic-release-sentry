# Semantic Release Plugin for Sentry releases

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Renovate](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)

This is a [Semantic Release](https://github.com/semantic-release/semantic-release) plugin that creates [Sentry](https://sentry.io/) releases.

## Usage

Just install the plugin with `npm install @droidsolutions/semantic-release-sentry` and add a line to your plugin config:

```json
{
  "release": {
    "plugins": ["...", "@droidsolutions/semantic-release-sentry"]
  }
}
```

### Configuration

#### packageName

If you don't give any configuration, the name from package.json will be used, along with the version number to create the release. If you like to use another name you can provide a `packageName` setting with the name you want to have. Be aware of the [name limitations](https://docs.sentry.io/workflow/releases/?platform=node#configure-sdk) Sentry gives in their docs.

#### uploadSourceMaps

Per default source maps are not uploaded to Sentry if nothing specified. If you wan't to upload source maps (for example if you have a JS/TS project) just set `uploadSourceMaps` to true in the config. You can specify the sources directory with the `sources` config. if not given `dist` is assumed as the source directory.

#### allowSentryFailure

This setting prevents errors from this plugin when Sentry is not reachable somehow. If set to true, all errors will be catched but this probably also means, that no Sentry release is created and no source maps are uploaded. If you rely on the existing Sentry release somewhere later in your CI pipeline (for example in the deploy job) you should also make it failsave.
