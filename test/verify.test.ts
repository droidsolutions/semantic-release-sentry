import execa, { ExecaReturnBase } from "execa";
import { Context } from "semantic-release";
import { UserConfig } from "../lib/userConfig";
import { verify } from "../lib/verify";

jest.mock("execa");

describe("verify", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let context: Context;
  let execaMock: jest.Mock<ExecaReturnBase<string>, unknown[]>;

  beforeAll(() => {
    originalEnv = process.env;
    const logMock = jest.fn<void, unknown[]>();
    context = {
      env: {},
      logger: { log: logMock, error: logMock },
      nextRelease: { gitTag: "v1.0.0", notes: "", type: "major", gitHead: "", version: "1.0.0" },
    };
    execaMock = execa as unknown as jest.Mock<ExecaReturnBase<string>, unknown[]>;
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
