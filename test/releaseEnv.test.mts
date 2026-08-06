import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { releaseEnvKey, writeReleaseEnv } from "../lib/releaseEnv.mjs";
import { ReleaseTarget } from "../lib/userConfig.mjs";

const target = (packageName: string, ...sentryProjects: string[]): ReleaseTarget => ({
  packageName,
  sentryProjects,
  uploadSourceMaps: false,
  sources: "dist",
});

describe("releaseEnvKey", () => {
  it("uses the bare SENTRY_RELEASE_NAME key when a single release is managed", () => {
    const only = target("my-app", "my-project");

    expect(releaseEnvKey([only], only)).toBe("SENTRY_RELEASE_NAME");
  });

  it("suffixes the key with the project slug when several releases are managed", () => {
    const api = target("my-app-api", "my-project-api");
    const worker = target("my-app-worker", "my-project-worker");

    expect(releaseEnvKey([api, worker], api)).toBe("SENTRY_RELEASE_NAME_MY_PROJECT_API");
    expect(releaseEnvKey([api, worker], worker)).toBe("SENTRY_RELEASE_NAME_MY_PROJECT_WORKER");
  });

  it("joins every project of a release into the key", () => {
    const combined = target("my-app", "api", "admin");

    expect(releaseEnvKey([combined, target("my-app-worker", "worker")], combined)).toBe(
      "SENTRY_RELEASE_NAME_API_ADMIN",
    );
  });

  it("keeps the key of a surviving release stable when another release fails", () => {
    const api = target("my-app-api", "my-project-api");
    const worker = target("my-app-worker", "my-project-worker");

    // Called with every configured release, not just the ones that succeeded.
    expect(releaseEnvKey([api, worker], worker)).toBe("SENTRY_RELEASE_NAME_MY_PROJECT_WORKER");
  });
});

describe("writeReleaseEnv", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "sentry-release-env-"));
    delete process.env.GITHUB_ENV;
    delete process.env.SENTRY_RELEASE_NAME;
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
    delete process.env.GITHUB_ENV;
    delete process.env.SENTRY_RELEASE_NAME;
  });

  it("appends the entries to the configured dotenv file", async () => {
    const envFile = path.join(dir, "build.env");

    await writeReleaseEnv([["SENTRY_RELEASE_NAME", "my-app@1.2.3"]], envFile);

    expect(await fs.readFile(envFile, "utf8")).toBe(`SENTRY_RELEASE_NAME=my-app@1.2.3${os.EOL}`);
  });

  it("exports the entries into the current process", async () => {
    await writeReleaseEnv([["SENTRY_RELEASE_NAME", "my-app@1.2.3"]], false);

    expect(process.env.SENTRY_RELEASE_NAME).toBe("my-app@1.2.3");
  });

  it("writes no file when the dotenv file is disabled", async () => {
    await writeReleaseEnv([["SENTRY_RELEASE_NAME", "my-app@1.2.3"]], false);

    expect(await fs.readdir(dir)).toEqual([]);
  });

  it("also appends to the GitHub Actions environment file when the runner provides one", async () => {
    const githubEnv = path.join(dir, "github.env");
    process.env.GITHUB_ENV = githubEnv;

    await writeReleaseEnv([["SENTRY_RELEASE_NAME", "my-app@1.2.3"]], false);

    expect(await fs.readFile(githubEnv, "utf8")).toBe(`SENTRY_RELEASE_NAME=my-app@1.2.3${os.EOL}`);
  });
});
