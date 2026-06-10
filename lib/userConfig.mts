export interface UserConfig {
  packageName?: string;
  allowSentryFailure: boolean;
  uploadSourceMaps: boolean;
  sources?: string;
  sentryProject?: string;
  sentryOrg?: string;
  sentryUrl?: string;
}
