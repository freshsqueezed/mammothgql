import { execute } from "graphql";
import { InternalServerError } from "./errors";

export async function executeQuery(
  schema: any,
  document: any,
  contextValue: any,
  variables: any
) {
  try {
    return await execute({
      schema,
      document,
      contextValue,
      variableValues: variables,
    });
  } catch (error) {
    throw new InternalServerError(
      error instanceof Error
        ? error.message
        : "Unknown error during query execution"
    );
  }
}
