import { NextFunction, Request, Response } from 'express';
import {
  execute,
  getOperationAST,
  GraphQLError,
  parse,
  Source,
  specifiedRules,
  validate,
  validateSchema,
} from 'graphql';
import type {
  GraphQLSchema,
  DocumentNode,
  FormattedExecutionResult,
  GraphQLFormattedError,
  ValidationRule,
} from 'graphql';
import { handleValidationErrors } from './utils';
import { graphiqlHtml } from './html';

interface MammothOptions<TContext> {
  schema: GraphQLSchema;
  context: ({ req, res }: { req: Request; res: Response }) => TContext;
  pretty?: boolean;
  graphiql?: boolean;
  validationRules?: ValidationRule[];
}

export function mammothGraphql<TContext>(options: MammothOptions<TContext>) {
  const {
    schema,
    pretty = false,
    graphiql: showGraphiQL = false,
    validationRules = [],
  } = options;

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res
        .status(405)
        .json(
          createErrorMessages(['GraphQL only supports GET and POST requests.']),
        );
      return;
    }

    const { query, variables, operationName } = req.body;

    if (!query) {
      if (showGraphiQL && req.method === 'GET') {
        graphiqlHtml(req, res);
        return;
      }
      res.status(400).json(createErrorMessages(['Must provide query string.']));
      return;
    }

    const schemaErrors = validateSchema(schema);
    if (schemaErrors.length > 0) {
      res
        .status(500)
        .json(
          createErrorMessages(
            ['GraphQL schema validation error.'],
            schemaErrors,
          ),
        );
      return;
    }

    let documentAST: DocumentNode;
    try {
      documentAST = parse(new Source(query, 'GraphQL request'));
    } catch (error: unknown) {
      const syntaxError =
        error instanceof Error ? error : new Error('Unknown parsing error');

      const graphQLError = new GraphQLError(syntaxError.message, {
        originalError: syntaxError,
      });

      res
        .status(400)
        .json(createErrorMessages(['GraphQL syntax error.'], [graphQLError]));
      return;
    }

    const validationErrors = validate(schema, documentAST, [
      ...specifiedRules,
      ...validationRules,
    ]);

    if (validationErrors.length > 0) {
      res
        .status(400)
        .json(
          createErrorMessages(['GraphQL validation error.'], validationErrors),
        );
      return;
    }

    if (req.method === 'GET') {
      const operationAST = getOperationAST(documentAST, operationName);
      if (operationAST?.operation !== 'query') {
        res
          .status(405)
          .json(
            createErrorMessages([
              `Can only perform ${operationAST?.operation} operations via POST.`,
            ]),
          );
        return;
      }
    }

    try {
      const result = await execute({
        schema,
        document: documentAST,
        contextValue: options.context({ req, res }),
        variableValues: variables,
        operationName,
      });

      if (!result.data && result.errors) {
        res.status(500).json(
          createErrorMessages(
            result.errors.map((e) => e.message),
            result.errors,
          ),
        );
        return;
      }

      const payload = pretty ? JSON.stringify(result, null, 2) : result;
      res.status(200).json(payload);
    } catch (error: unknown) {
      const executionError =
        error instanceof Error ? error : new Error('Unknown execution error');
      const graphQLError = new GraphQLError(executionError.message, {
        originalError: executionError,
        nodes: documentAST,
      });
      res
        .status(400)
        .json(
          createErrorMessages(
            ['GraphQL execution context error.'],
            [graphQLError],
          ),
        );
    } finally {
      next();
    }
  };
}

const createErrorMessages = (
  messages: string[],
  graphqlErrors?: readonly GraphQLError[] | readonly GraphQLFormattedError[],
) => ({
  errors: graphqlErrors ?? messages.map((message) => ({ message })),
});
