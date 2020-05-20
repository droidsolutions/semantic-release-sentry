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

#### skipUploadSourceMaps

Per default source maps are uploaded to Sentry if nothing specified. If you wan't to skip uploading source maps (for example if you have a non JS project) just set `skipUploadSourceMaps` to true in the config.
