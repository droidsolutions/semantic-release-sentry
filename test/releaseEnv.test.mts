import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertUniqueEnvKeys,
  exportedReleaseNames,
  releaseEnvKey,
  releasesEnvEntry,
  writeReleaseEnv,
} from "../lib/releaseEnv.mjs";
import { ReleaseTarget } from "../lib/userConfig.mjs";

const target = (packageName: string | undefined, ...sentryProjects: string[]): ReleaseTarget => ({
  packageName,
  sentryProjects,
  uploadSourceMaps: false,
  sources: "dist",
});

const clearReleaseEnv = (): void => {
  for (const key of Object.keys(process.env).filter((k) => k.startsWith("SENTRY_RELEASE"))) {
    delete process.env[key];
  }
};

describe("releaseEnvKey", () => {
  it("uses the bare SENTRY_RELEASE_NAME key when the config declares no releases", () => {
    expect(releaseEnvKey(target("my-app", "my-project"), false)).toBe("SENTRY_RELEASE_NAME");
  });

  it("suffixes the key with the package name once the releases array is used", () => {
    expect(releaseEnvKey(target("my-app-api", "my-project"), true)).toBe("SENTRY_RELEASE_NAME_MY_APP_API");
  });

  it("builds the key from the package name alone, so the projects a release is in never change it", () => {
    expect(releaseEnvKey(target("my-app-api", "one-project"), true)).toBe("SENTRY_RELEASE_NAME_MY_APP_API");
    expect(releaseEnvKey(target("my-app-api", "another", "third"), true)).toBe("SENTRY_RELEASE_NAME_MY_APP_API");
  });

  it("gives releases that share one Sentry project distinct keys", () => {
    const api = target("my-app-api", "my-project");
    const sender = target("my-app-sender", "my-project");
    const worker = target("my-app-worker", "my-project");

    expect([api, sender, worker].map((t) => releaseEnvKey(t, true))).toEqual([
      "SENTRY_RELEASE_NAME_MY_APP_API",
      "SENTRY_RELEASE_NAME_MY_APP_SENDER",
      "SENTRY_RELEASE_NAME_MY_APP_WORKER",
    ]);
  });

  it("replaces every character an environment variable name cannot hold", () => {
    expect(releaseEnvKey(target("@my-scope/my-app.api", "my-project"), true)).toBe(
      "SENTRY_RELEASE_NAME_MY_SCOPE_MY_APP_API",
    );
  });

  it("throws when no package name could be resolved", () => {
    expect(() => releaseEnvKey(target(undefined, "my-project"), true)).toThrow(/packageName/);
  });
});

describe("assertUniqueEnvKeys", () => {
  it("throws when two releases resolve to the same key", () => {
    const targets = [target("my-app", "api"), target("my-app", "worker")];

    expect(() => {
      assertUniqueEnvKeys(targets, true);
    }).toThrow(/my-app/);
  });

  it("accepts releases that resolve to distinct keys", () => {
    const targets = [target("my-app-api", "my-project"), target("my-app-worker", "my-project")];

    expect(() => {
      assertUniqueEnvKeys(targets, true);
    }).not.toThrow();
  });

  it("accepts a single release that is not suffixed at all", () => {
    expect(() => {
      assertUniqueEnvKeys([target("my-app", "my-project")], false);
    }).not.toThrow();
  });
});

describe("releasesEnvEntry", () => {
  it("joins every release name into the SENTRY_RELEASES key", () => {
    expect(releasesEnvEntry(["my-app-api@1.2.3", "my-app-worker@1.2.3"])).toEqual([
      "SENTRY_RELEASES",
      "my-app-api@1.2.3;my-app-worker@1.2.3",
    ]);
  });

  it("carries a single release name without a separator", () => {
    expect(releasesEnvEntry(["my-app@1.2.3"])).toEqual(["SENTRY_RELEASES", "my-app@1.2.3"]);
  });
});

describe("exportedReleaseNames", () => {
  beforeEach(clearReleaseEnv);
  afterEach(clearReleaseEnv);

  it("returns every exported release name", async () => {
    await writeReleaseEnv(
      [
        ["SENTRY_RELEASE_NAME_MY_APP_API", "my-app-api@1.2.3"],
        ["SENTRY_RELEASE_NAME_MY_APP_WORKER", "my-app-worker@1.2.3"],
      ],
      false,
    );

    expect(exportedReleaseNames().sort()).toEqual(["my-app-api@1.2.3", "my-app-worker@1.2.3"]);
  });

  it("ignores the aggregate key, so no release is deleted twice", async () => {
    await writeReleaseEnv(
      [["SENTRY_RELEASE_NAME_MY_APP_API", "my-app-api@1.2.3"], releasesEnvEntry(["my-app-api@1.2.3"])],
      false,
    );

    expect(exportedReleaseNames()).toEqual(["my-app-api@1.2.3"]);
  });
});

describe("writeReleaseEnv", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "sentry-release-env-"));
    delete process.env.GITHUB_ENV;
    clearReleaseEnv();
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
    delete process.env.GITHUB_ENV;
    clearReleaseEnv();
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
