import { DocumentNode, execute, GraphQLSchema } from 'graphql';
import { InternalServerError } from './errors';
import { Maybe } from 'graphql/jsutils/Maybe';

export async function executeQuery(
  schema: GraphQLSchema,
  document: DocumentNode,
  contextValue: unknown,
  variables: Maybe<{
    readonly [variable: string]: unknown;
  }>,
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
        : 'Unknown error during query execution',
    );
  }
}
