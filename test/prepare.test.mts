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
    for (const key of Object.keys(process.env).filter((k) => k.startsWith("SENTRY_RELEASE_NAME"))) {
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

    expect(process.env["SENTRY_RELEASE_NAME_API"]).toBe("my-app-api@1.2.3");
    expect(process.env["SENTRY_RELEASE_NAME_WORKER"]).toBe("my-app-worker@1.2.3");
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
    expect(process.env["SENTRY_RELEASE_NAME_API"]).toBeUndefined();
    expect(process.env["SENTRY_RELEASE_NAME_WORKER"]).toBe("my-app-worker@1.2.3");
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
