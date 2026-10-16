import { execa } from "execa";
import { FailContext } from "semantic-release";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fail } from "../lib/fail.mjs";
import { UserConfig } from "../lib/userConfig.mjs";

vi.mock("execa");

const context = {
  errors: new AggregateError([]),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: { log: vi.fn(), error: vi.fn() } as any,
} as unknown as FailContext;

const cliCalls = (): string[][] => vi.mocked(execa).mock.calls.map((call) => call[1] as string[]);

describe("fail", () => {
  beforeEach(() => {
    vi.mocked(execa).mockClear();
    delete process.env.SENTRY_ORG;
  });

  afterEach(() => {
    for (const key of Object.keys(process.env).filter((k) => k.startsWith("SENTRY_RELEASE_NAME"))) {
      delete process.env[key];
    }
  });

  it("deletes the release prepare exported, since the fail step gets no version", async () => {
    process.env.SENTRY_RELEASE_NAME = "my-app@1.2.3";

    await fail({ sentryOrg: "my-org" } as UserConfig, context);

    expect(cliCalls()).toEqual([["releases", "delete", "my-app@1.2.3", "-o", "my-org"]]);
  });

  it("deletes every release when several were exported", async () => {
    process.env["SENTRY_RELEASE_NAME_API"] = "my-app-api@1.2.3";
    process.env["SENTRY_RELEASE_NAME_WORKER"] = "my-app-worker@1.2.3";

    await fail({ sentryOrg: "my-org" } as UserConfig, context);

    expect(
      cliCalls()
        .map((args) => args[2])
        .sort(),
    ).toEqual(["my-app-api@1.2.3", "my-app-worker@1.2.3"]);
  });

  it("never fails the run, since it only ever runs when the release already failed", async () => {
    process.env.SENTRY_RELEASE_NAME = "my-app@1.2.3";
    vi.mocked(execa).mockRejectedValue(new Error("connection refused"));

    // No allowSentryFailure: cleanup errors must not bury the error that caused the failure.
    await expect(fail({ sentryOrg: "my-org" } as UserConfig, context)).resolves.toBeUndefined();
  });

  it("does nothing when prepare never got as far as creating a release", async () => {
    await fail({ sentryOrg: "my-org" } as UserConfig, context);

    expect(cliCalls()).toEqual([]);
  });
});
