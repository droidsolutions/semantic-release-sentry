import { afterEach, describe, expect, it } from "vitest";
import { loadTargets, releaseName, resolveTargets, targetArgs } from "../lib/targets.mjs";
import { ReleaseTarget, UserConfig } from "../lib/userConfig.mjs";

const target = (overrides: Partial<ReleaseTarget> = {}): ReleaseTarget => ({
  packageName: "my-app",
  sentryProjects: ["my-project"],
  uploadSourceMaps: false,
  sources: "dist",
  ...overrides,
});

describe("resolveTargets", () => {
  it("builds one target from the flat config keys when no releases array is given", () => {
    const targets = resolveTargets({ packageName: "my-app", sentryProject: "my-project" } as UserConfig, {});

    expect(targets).toEqual([
      { packageName: "my-app", sentryProjects: ["my-project"], uploadSourceMaps: false, sources: "dist" },
    ]);
  });

  it("builds one target per releases entry", () => {
    const targets = resolveTargets(
      {
        releases: [
          { packageName: "my-app-api", sentryProject: "api" },
          { packageName: "my-app-worker", sentryProject: "worker" },
        ],
      } as UserConfig,
      {},
    );

    expect(targets.map((t) => [t.packageName, t.sentryProjects])).toEqual([
      ["my-app-api", ["api"]],
      ["my-app-worker", ["worker"]],
    ]);
  });

  it("lets a releases entry inherit top level settings and override them individually", () => {
    const targets = resolveTargets(
      {
        uploadSourceMaps: true,
        sources: "build",
        releases: [{ sentryProject: "api" }, { sentryProject: "worker", sources: "worker-build" }],
      } as UserConfig,
      { packageName: "my-app" },
    );

    expect(targets).toEqual([
      { packageName: "my-app", sentryProjects: ["api"], uploadSourceMaps: true, sources: "build" },
      { packageName: "my-app", sentryProjects: ["worker"], uploadSourceMaps: true, sources: "worker-build" },
    ]);
  });

  it("attaches a single release to every project when sentryProject is an array", () => {
    const targets = resolveTargets(
      { packageName: "my-app", sentryProject: ["api", "admin", "worker"] } as UserConfig,
      {},
    );

    expect(targets).toHaveLength(1);
    expect(targets[0]?.sentryProjects).toEqual(["api", "admin", "worker"]);
  });

  it("falls back to the resolved default project when no config supplies one", () => {
    const targets = resolveTargets({ packageName: "my-app" } as UserConfig, { sentryProject: "from-env" });

    expect(targets[0]?.sentryProjects).toEqual(["from-env"]);
  });
});

describe("loadTargets", () => {
  afterEach(() => {
    delete process.env.npm_package_name;
    delete process.env.SENTRY_PROJECT;
  });

  it("falls back to the npm_package_name environment variable", async () => {
    process.env.npm_package_name = "app-from-env";

    const targets = await loadTargets({ sentryProject: "my-project" } as UserConfig);

    expect(targets[0]?.packageName).toBe("app-from-env");
  });

  it("falls back to the SENTRY_PROJECT environment variable", async () => {
    process.env.SENTRY_PROJECT = "project-from-env";

    const targets = await loadTargets({ packageName: "my-app" } as UserConfig);

    expect(targets[0]?.sentryProjects).toEqual(["project-from-env"]);
  });

  it("reads the package name from package.json when nothing else supplies one", async () => {
    const targets = await loadTargets({ sentryProject: "my-project" } as UserConfig);

    expect(targets[0]?.packageName).toBe("@droidsolutions-oss/semantic-release-sentry");
  });

  it("does not read package.json when every release names itself", async () => {
    const targets = await loadTargets({
      releases: [
        { packageName: "my-app-api", sentryProject: "api" },
        { packageName: "my-app-worker", sentryProject: "worker" },
      ],
    } as UserConfig);

    expect(targets.map((t) => t.packageName)).toEqual(["my-app-api", "my-app-worker"]);
  });
});

describe("releaseName", () => {
  it("joins the package name and the version with an @", () => {
    expect(releaseName(target({ packageName: "my-app" }), "1.2.3")).toBe("my-app@1.2.3");
  });

  it("refuses to name a release rather than calling it undefined", () => {
    expect(() => releaseName(target({ packageName: undefined, sentryProjects: ["api"] }), "1.2.3")).toThrow(
      /no release name/i,
    );
  });
});

describe("targetArgs", () => {
  it("passes the organisation and project to the CLI as flags", () => {
    expect(targetArgs("my-org", target({ sentryProjects: ["my-project"] }))).toEqual([
      "-o",
      "my-org",
      "-p",
      "my-project",
    ]);
  });

  it("repeats the project flag once per project", () => {
    expect(targetArgs("my-org", target({ sentryProjects: ["api", "worker"] }))).toEqual([
      "-o",
      "my-org",
      "-p",
      "api",
      "-p",
      "worker",
    ]);
  });

  it("omits the organisation flag when no organisation is known, leaving the CLI its own fallbacks", () => {
    expect(targetArgs(undefined, target({ sentryProjects: ["my-project"] }))).toEqual(["-p", "my-project"]);
  });
});
