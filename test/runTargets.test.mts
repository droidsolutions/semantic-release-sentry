import { describe, expect, it, vi } from "vitest";
import { runForEachTarget } from "../lib/runTargets.mjs";
import { ReleaseTarget } from "../lib/userConfig.mjs";

const target = (project: string): ReleaseTarget => ({
  packageName: "my-app",
  sentryProjects: [project],
  uploadSourceMaps: false,
  sources: "dist",
});

const logger = () => ({ log: vi.fn(), error: vi.fn() });

describe("runForEachTarget", () => {
  it("attempts every target even after one of them fails", async () => {
    const attempted: string[] = [];
    const run = runForEachTarget(
      [target("api"), target("admin"), target("worker")],
      { allowSentryFailure: false, logger: logger(), message: "Failed to create Sentry release" },
      async (t) => {
        attempted.push(t.sentryProjects[0] as string);
        if (t.sentryProjects[0] === "admin") {
          throw new Error("project not found");
        }
      },
    );

    await expect(run).rejects.toThrow();
    expect(attempted).toEqual(["api", "admin", "worker"]);
  });

  it("reports one Semantic Release error per failed target, naming the project", async () => {
    let actual: AggregateError | undefined;
    try {
      await runForEachTarget(
        [target("api"), target("admin"), target("worker")],
        { allowSentryFailure: false, logger: logger(), message: "Failed to create Sentry release" },
        async (t) => {
          if (t.sentryProjects[0] !== "api") {
            throw new Error("project not found");
          }
        },
      );
    } catch (err) {
      actual = err as AggregateError;
    }

    expect(actual?.errors).toHaveLength(2);
    expect(actual?.errors.map((e: Error) => e.message)).toEqual([
      "Failed to create Sentry release for project admin",
      "Failed to create Sentry release for project worker",
    ]);
    expect(actual?.errors[0].code).toBe("E_UNKNOWN_ERROR_DURING_EXECA_COMMAND");
  });

  it("logs and swallows every failure when allowSentryFailure is set", async () => {
    const log = logger();

    await expect(
      runForEachTarget(
        [target("api")],
        { allowSentryFailure: true, logger: log, message: "Failed to create Sentry release" },
        () => Promise.reject(new Error("project not found")),
      ),
    ).resolves.toBeUndefined();

    expect(log.log).toHaveBeenCalledWith(expect.stringContaining("project not found"));
  });
});
