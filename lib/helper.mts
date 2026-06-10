import SemanticReleaseError from "@semantic-release/error";
import { ExecaSyncError } from "execa";

/**
 * Builds a Semantic Release error.
 *
 * @param error The error or whatever was you got in the catch block.
 * @param message The message to use in the error.
 * @returns A Semantic Release error instance.
 */
export const convertExecaResultToSemanticReleaseError = (error: unknown, message: string): SemanticReleaseError => {
  if (error && Object.prototype.hasOwnProperty.call(error, "exitCode")) {
    const result = error as ExecaSyncError<string>;

    return new SemanticReleaseError(message, "ESENTRYCLIFAILURE", result.stderr ?? result.message);
  }

  return new SemanticReleaseError(message, "E_UNKNOWN_ERROR_DURING_EXECA_COMMAND");
};
