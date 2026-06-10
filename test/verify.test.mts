import { VerifyConditionsContext } from "semantic-release";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { UserConfig } from "../lib/userConfig.mjs";
import { verify } from "../lib/verify.mjs";

vi.mock("execa");

describe("verify", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let context: VerifyConditionsContext;

  beforeAll(() => {
    originalEnv = process.env;
    const logMock = vi.fn();
    context = {
      branch: { name: "main" },
      branches: [],
      env: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger: { log: logMock, error: logMock } as any,
    } as unknown as VerifyConditionsContext;
  });

  afterAll(() => {
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
      "No Sentry project is set, either set it via sentryProject config or SENTRY_PROJECT environment variable.",
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
});
