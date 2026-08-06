import { convertExecaResultToSemanticReleaseError } from "./helper.mjs";
import { ReleaseTarget } from "./userConfig.mjs";

export interface RunOptions {
  /** Whether failures should be logged and swallowed instead of failing the release. */
  allowSentryFailure: boolean;

  logger: { log: (message: string) => void; error: (message: string, ...args: unknown[]) => void };

  /** What the step was trying to do, used as the prefix of every error message. */
  message: string;

  /** Why failures are being swallowed, for the log. Defaults to the `allowSentryFailure` setting. */
  ignoreReason?: string;
}

/**
 * Runs a step for every item, collecting failures instead of stopping at the first one.
 *
 * Items are handled one after another rather than concurrently because the Sentry CLI inherits this
 * process' stdio, and parallel runs would interleave their output into an unreadable CI log.
 *
 * @param items The things to act on, usually releases.
 * @param options How to report failures, and how to name an item in an error message.
 * @param run The work to do for a single item.
 * @throws AggregateError If any item failed and `allowSentryFailure` is not set. It holds one
 * Semantic Release error per failed item.
 */
export const runForEach = async <T,>(
  items: T[],
  options: RunOptions & { describe: (item: T) => string },
  run: (item: T) => Promise<void>,
): Promise<void> => {
  const failures: { cause: unknown; error: Error }[] = [];

  for (const item of items) {
    try {
      await run(item);
    } catch (err) {
      const where = options.describe(item);
      options.logger.error(`${options.message} for ${where}.`, err);
      failures.push({
        cause: err,
        error: convertExecaResultToSemanticReleaseError(err, `${options.message} for ${where}`),
      });
    }
  }

  if (failures.length === 0) {
    return;
  }

  if (options.allowSentryFailure) {
    // Log what actually went wrong rather than the summary, since nothing else will surface it.
    const causes = failures.map((f) => (f.cause as Error).message).join("; ");
    const reason = options.ignoreReason ?? "this is allowed by config";
    options.logger.log(`Ignoring Sentry failure, ${reason}. Err: ${causes}`);
    return;
  }

  throw new AggregateError(
    failures.map((f) => f.error),
    options.message,
  );
};

/**
 * Runs a step for every release, naming the Sentry projects when one of them fails.
 *
 * @param targets The releases to act on.
 * @param options How to report failures.
 * @param run The work to do for a single release.
 */
export const runForEachTarget = (
  targets: ReleaseTarget[],
  options: RunOptions,
  run: (target: ReleaseTarget) => Promise<void>,
): Promise<void> =>
  runForEach(targets, { ...options, describe: (target) => `project ${target.sentryProjects.join(", ")}` }, run);
