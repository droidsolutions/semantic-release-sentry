import { execa } from "execa";
import { VerifyConditionsContext } from "semantic-release";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getSentryCliPath } from "../lib/helper.mjs";
import { UserConfig } from "../lib/userConfig.mjs";
import { verify } from "../lib/verify.mjs";

vi.mock("execa");

describe("verify", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let context: VerifyConditionsContext;

  beforeAll(() => {
    const logMock = vi.fn();
    context = {
      branch: { name: "main" },
      branches: [],
      env: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger: { log: logMock, error: logMock } as any,
    } as unknown as VerifyConditionsContext;
  });

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.SENTRY_URL;
    delete process.env.SENTRY_ORG;
    delete process.env.SENTRY_PROJECT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should report an error when SENTRY_PROJECT is no set", async () => {
    process.env.SENTRY_AUTH_TOKEN = "a10b2c3d4";
    let actualErr: AggregateError | undefined;
    try {
      await verify({ sentryOrg: "SomeOrga" } as UserConfig, context);
    } catch (err) {
      actualErr = err as AggregateError;
    }

    expect(actualErr).toBeDefined();
    expect(actualErr?.errors[0].message).toBe(
      "No Sentry project is set for release @droidsolutions-oss/semantic-release-sentry, either set it via " +
        "sentryProject config or SENTRY_PROJECT environment variable.",
    );
  });

  it("should report an error when SENTRY_ORG is no set", async () => {
    process.env.SENTRY_AUTH_TOKEN = "a10b2c3d4";
    let actualErr: AggregateError | undefined;
    try {
      await verify({ sentryProject: "some-project" } as UserConfig, context);
    } catch (err) {
      actualErr = err as AggregateError;
    }

    expect(actualErr).toBeDefined();
    expect(actualErr?.errors[0].message).toBe(
      "No Sentry organisation is set, either set it via sentryOrg config or SENTRY_ORG environment variable.",
    );
  });

  it("should report an error when SENTRY_AUTH_TOKEN is no set", async () => {
    delete process.env.SENTRY_AUTH_TOKEN;
    let actualErr: AggregateError | undefined;
    try {
      await verify({ sentryProject: "some-project", sentryOrg: "some-orga" } as UserConfig, context);
    } catch (err) {
      actualErr = err as AggregateError;
    }

    expect(actualErr).toBeDefined();
    expect(actualErr?.errors[0].message).toBe("Environment variable SENTRY_AUTH_TOKEN is not set!");
  });

  it("runs sentry-cli at the path resolved by @sentry/cli, not a hardcoded node_modules path", async () => {
    process.env.SENTRY_AUTH_TOKEN = "a10b2c3d4";

    await verify({ sentryProject: "some-project", sentryOrg: "some-orga", packageName: "test" } as UserConfig, context);

    expect(vi.mocked(execa)).toHaveBeenCalledWith(getSentryCliPath(), ["info"], { stdio: "inherit" });
  });

  it("prefers the configured Sentry URL over the environment variable", async () => {
    process.env.SENTRY_AUTH_TOKEN = "a10b2c3d4";
    process.env.SENTRY_URL = "https://from-env.example.com";

    await verify(
      {
        sentryProject: "some-project",
        sentryOrg: "some-orga",
        packageName: "test",
        sentryUrl: "https://from-config.example.com",
      } as UserConfig,
      context,
    );

    expect(process.env.SENTRY_URL).toBe("https://from-config.example.com");
  });

  it("leaves SENTRY_URL untouched when neither config nor environment sets one", async () => {
    process.env.SENTRY_AUTH_TOKEN = "a10b2c3d4";

    await verify({ sentryProject: "some-project", sentryOrg: "some-orga", packageName: "test" } as UserConfig, context);

    expect(process.env.SENTRY_URL).toBeUndefined();
  });

  it("reports the release that is missing a project when several are configured", async () => {
    process.env.SENTRY_AUTH_TOKEN = "a10b2c3d4";
    let actualErr: AggregateError | undefined;
    try {
      await verify(
        {
          sentryOrg: "some-orga",
          releases: [{ packageName: "my-app-api", sentryProject: "api" }, { packageName: "my-app-worker" }],
        } as UserConfig,
        context,
      );
    } catch (err) {
      actualErr = err as AggregateError;
    }

    expect(actualErr?.errors).toHaveLength(1);
    expect(actualErr?.errors[0].message).toContain("my-app-worker");
  });
});
