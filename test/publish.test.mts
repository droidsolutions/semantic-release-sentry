import { execa } from "execa";
import { PublishContext } from "semantic-release";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publish } from "../lib/publish.mjs";
import { UserConfig } from "../lib/userConfig.mjs";

vi.mock("execa");

const context = {
  nextRelease: { version: "1.2.3" },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: { log: vi.fn(), error: vi.fn() } as any,
} as unknown as PublishContext;

const cliCalls = (): string[][] => vi.mocked(execa).mock.calls.map((call) => call[1] as string[]);

describe("publish", () => {
  beforeEach(() => {
    vi.mocked(execa).mockClear();
    delete process.env.SENTRY_ORG;
    delete process.env.SENTRY_PROJECT;
  });

  it("uploads nothing when no release asks for source maps", async () => {
    await publish({ packageName: "my-app", sentryOrg: "my-org", sentryProject: "my-project" } as UserConfig, context);

    expect(cliCalls()).toEqual([]);
  });

  it("uploads the source maps of a release to its own project", async () => {
    await publish(
      {
        packageName: "my-app",
        sentryOrg: "my-org",
        sentryProject: "my-project",
        uploadSourceMaps: true,
      } as UserConfig,
      context,
    );

    expect(cliCalls()).toEqual([
      ["sourcemaps", "upload", "--release", "my-app@1.2.3", "dist", "-o", "my-org", "-p", "my-project"],
    ]);
  });

  it("uploads only for the releases that enabled it, each from its own sources directory", async () => {
    await publish(
      {
        sentryOrg: "my-org",
        releases: [
          { packageName: "my-app-api", sentryProject: "api", uploadSourceMaps: true, sources: "api/dist" },
          { packageName: "my-app-worker", sentryProject: "worker" },
        ],
      } as UserConfig,
      context,
    );

    expect(cliCalls()).toEqual([
      ["sourcemaps", "upload", "--release", "my-app-api@1.2.3", "api/dist", "-o", "my-org", "-p", "api"],
    ]);
  });
});
