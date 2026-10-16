import SemanticReleaseError from "@semantic-release/error";
import { SentryCli } from "@sentry/cli";
import { ExecaError } from "execa";

/**
 * Resolves the absolute path to the bundled `sentry-cli` binary.
 *
 * Using `SentryCli.getPath()` instead of a hardcoded `node_modules/.bin` path
 * ensures the binary is found regardless of the consumer's install layout
 * (npm/Yarn hoisting, pnpm's nested store, Yarn PnP, monorepos).
 *
 * @returns The absolute path to the `sentry-cli` executable.
 */
export const getSentryCliPath = (): string => SentryCli.getPath();

/**
 * Builds a Semantic Release error.
 *
 * @param error The error or whatever was you got in the catch block.
 * @param message The message to use in the error.
 * @returns A Semantic Release error instance.
 */
export const convertExecaResultToSemanticReleaseError = (error: unknown, message: string): SemanticReleaseError => {
  if (error instanceof ExecaError) {
    // stderr is only captured when not inheriting the parent's stdio; fall back
    // to the error message otherwise.
    const details = typeof error.stderr === "string" ? error.stderr : error.message;

    return new SemanticReleaseError(message, "ESENTRYCLIFAILURE", details);
  }

  return new SemanticReleaseError(message, "E_UNKNOWN_ERROR_DURING_EXECA_COMMAND");
};
