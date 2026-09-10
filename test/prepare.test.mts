import { execa } from "execa";
import { PrepareContext } from "semantic-release";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepare } from "../lib/prepare.mjs";
import { UserConfig } from "../lib/userConfig.mjs";

vi.mock("execa");

const context = {
  nextRelease: { version: "1.2.3" },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: { log: vi.fn(), error: vi.fn() } as any,
} as unknown as PrepareContext;

/** The arguments of every Sentry CLI call, without the path to the binary. */
const cliCalls = (): string[][] => vi.mocked(execa).mock.calls.map((call) => call[1] as string[]);

describe("prepare", () => {
  beforeEach(() => {
    vi.mocked(execa).mockReset();
    delete process.env.SENTRY_ORG;
    delete process.env.SENTRY_PROJECT;
  });

  afterEach(() => {
    for (const key of Object.keys(process.env).filter((k) => k.startsWith("SENTRY_RELEASE"))) {
      delete process.env[key];
    }
  });

  it("passes the organisation and project from the plugin config to the CLI", async () => {
    await prepare(
      { packageName: "my-app", sentryOrg: "my-org", sentryProject: "my-project", envFile: false } as UserConfig,
      context,
    );

    expect(cliCalls()[0]).toEqual(["releases", "new", "my-app@1.2.3", "-o", "my-org", "-p", "my-project"]);
  });

  it("creates and links commits for every configured release", async () => {
    await prepare(
      {
        sentryOrg: "my-org",
        envFile: false,
        releases: [
          { packageName: "my-app-api", sentryProject: "api" },
          { packageName: "my-app-worker", sentryProject: "worker" },
        ],
      } as UserConfig,
      context,
    );

    expect(cliCalls()).toEqual([
      ["releases", "new", "my-app-api@1.2.3", "-o", "my-org", "-p", "api"],
      ["releases", "set-commits", "my-app-api@1.2.3", "--auto", "-o", "my-org", "-p", "api"],
      ["releases", "new", "my-app-worker@1.2.3", "-o", "my-org", "-p", "worker"],
      ["releases", "set-commits", "my-app-worker@1.2.3", "--auto", "-o", "my-org", "-p", "worker"],
    ]);
  });

  it("keeps the bare key when the config declares no releases", async () => {
    await prepare({ packageName: "my-app", sentryProject: "my-project", envFile: false } as UserConfig, context);

    expect(process.env["SENTRY_RELEASE_NAME"]).toBe("my-app@1.2.3");
  });

  it("suffixes the key as soon as the releases array is used, even for one entry", async () => {
    await prepare(
      { envFile: false, releases: [{ packageName: "my-app-api", sentryProject: "my-project" }] } as UserConfig,
      context,
    );

    expect(process.env["SENTRY_RELEASE_NAME_MY_APP_API"]).toBe("my-app-api@1.2.3");
    expect(process.env["SENTRY_RELEASE_NAME"]).toBeUndefined();
  });

  it("gives releases that share one Sentry project a key each", async () => {
    await prepare(
      {
        sentryProject: "my-project",
        envFile: false,
        releases: [{ packageName: "my-app-api" }, { packageName: "my-app-worker" }],
      } as UserConfig,
      context,
    );

    expect(process.env["SENTRY_RELEASE_NAME_MY_APP_API"]).toBe("my-app-api@1.2.3");
    expect(process.env["SENTRY_RELEASE_NAME_MY_APP_WORKER"]).toBe("my-app-worker@1.2.3");
  });

  it("exports every created release name in the aggregate key", async () => {
    await prepare(
      {
        sentryProject: "my-project",
        envFile: false,
        releases: [{ packageName: "my-app-api" }, { packageName: "my-app-worker" }],
      } as UserConfig,
      context,
    );

    expect(process.env["SENTRY_RELEASES"]).toBe("my-app-api@1.2.3;my-app-worker@1.2.3");
  });

  it("leaves a release out of the aggregate when it was never created", async () => {
    vi.mocked(execa).mockImplementation((_bin, args) => {
      if ((args as string[]).includes("my-app-api@1.2.3")) {
        return Promise.reject(new Error("connection refused")) as never;
      }
      return Promise.resolve({}) as never;
    });

    await prepare(
      {
        sentryProject: "my-project",
        envFile: false,
        allowSentryFailure: true,
        releases: [{ packageName: "my-app-api" }, { packageName: "my-app-worker" }],
      } as UserConfig,
      context,
    );

    expect(process.env["SENTRY_RELEASES"]).toBe("my-app-worker@1.2.3");
  });

  it("fails before creating anything when two releases resolve to the same key", async () => {
    await expect(
      prepare(
        {
          sentryProject: "my-project",
          envFile: false,
          releases: [{ packageName: "my-app" }, { packageName: "my-app" }],
        } as UserConfig,
        context,
      ),
    ).rejects.toThrow(/my-app/);

    expect(cliCalls()).toEqual([]);
  });

  it("exports one suffixed release name per release", async () => {
    await prepare(
      {
        sentryOrg: "my-org",
        envFile: false,
        releases: [
          { packageName: "my-app-api", sentryProject: "api" },
          { packageName: "my-app-worker", sentryProject: "worker" },
        ],
      } as UserConfig,
      context,
    );

    expect(process.env["SENTRY_RELEASE_NAME_MY_APP_API"]).toBe("my-app-api@1.2.3");
    expect(process.env["SENTRY_RELEASE_NAME_MY_APP_WORKER"]).toBe("my-app-worker@1.2.3");
  });

  it("exports a release name only once that release was actually created", async () => {
    vi.mocked(execa).mockImplementation((_bin, args) => {
      if ((args as string[]).includes("api")) {
        return Promise.reject(new Error("connection refused")) as never;
      }
      return Promise.resolve({}) as never;
    });

    await prepare(
      {
        sentryOrg: "my-org",
        envFile: false,
        allowSentryFailure: true,
        releases: [
          { packageName: "my-app-api", sentryProject: "api" },
          { packageName: "my-app-worker", sentryProject: "worker" },
        ],
      } as UserConfig,
      context,
    );

    // The fail step deletes whatever is exported, so a release that was never created must not be.
    expect(process.env["SENTRY_RELEASE_NAME_MY_APP_API"]).toBeUndefined();
    expect(process.env["SENTRY_RELEASE_NAME_MY_APP_WORKER"]).toBe("my-app-worker@1.2.3");
  });

  it("attempts every release and aggregates the failures", async () => {
    vi.mocked(execa).mockImplementation((_bin, args) => {
      if ((args as string[]).includes("api")) {
        return Promise.reject(new Error("project not found")) as never;
      }
      return Promise.resolve({}) as never;
    });

    let actualErr: AggregateError | undefined;
    try {
      await prepare(
        {
          sentryOrg: "my-org",
          envFile: false,
          releases: [
            { packageName: "my-app-api", sentryProject: "api" },
            { packageName: "my-app-worker", sentryProject: "worker" },
          ],
        } as UserConfig,
        context,
      );
    } catch (err) {
      actualErr = err as AggregateError;
    }

    expect(actualErr?.errors).toHaveLength(1);
    expect(actualErr?.errors[0].message).toContain("api");
    expect(cliCalls().some((args) => args.includes("worker"))).toBe(true);
  });
});
