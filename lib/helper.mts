import SemanticReleaseError from "@semantic-release/error";
import { ExecaError } from "execa";

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
