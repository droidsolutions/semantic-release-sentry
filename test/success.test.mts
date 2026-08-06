import { execa } from "execa";
import { SuccessContext } from "semantic-release";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { success } from "../lib/success.mjs";
import { UserConfig } from "../lib/userConfig.mjs";

vi.mock("execa");

const context = {
  nextRelease: { version: "1.2.3" },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: { log: vi.fn(), error: vi.fn() } as any,
} as unknown as SuccessContext;

const cliCalls = (): string[][] => vi.mocked(execa).mock.calls.map((call) => call[1] as string[]);

describe("success", () => {
  beforeEach(() => {
    vi.mocked(execa).mockClear();
    delete process.env.SENTRY_ORG;
    delete process.env.SENTRY_PROJECT;
  });

  it("finalizes every configured release in its own project", async () => {
    await success(
      {
        sentryOrg: "my-org",
        releases: [
          { packageName: "my-app-api", sentryProject: "api" },
          { packageName: "my-app-worker", sentryProject: "worker" },
        ],
      } as UserConfig,
      context,
    );

    expect(cliCalls()).toEqual([
      ["releases", "finalize", "my-app-api@1.2.3", "-o", "my-org", "-p", "api"],
      ["releases", "finalize", "my-app-worker@1.2.3", "-o", "my-org", "-p", "worker"],
    ]);
  });

  it("finalizes a release that spans several projects in a single call", async () => {
    await success(
      { packageName: "my-app", sentryOrg: "my-org", sentryProject: ["api", "admin"] } as UserConfig,
      context,
    );

    expect(cliCalls()).toEqual([["releases", "finalize", "my-app@1.2.3", "-o", "my-org", "-p", "api", "-p", "admin"]]);
  });
});
