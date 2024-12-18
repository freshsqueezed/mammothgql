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
} from 'graphql';
import { handleValidationErrors } from './utils';
import { customLandingHtml, disabledLandingPage, graphiqlHtml } from './html';

export interface MammothOptions<TContext> {
  schema: GraphQLSchema;
  context: ({ req, res }: { req: Request; res: Response }) => TContext;
  pretty?: boolean;
  graphiql?: boolean;
  validationRules: any[];
}

export function mammothGraphql<TContext>(options: MammothOptions<TContext>) {
  const schema = options.schema;
  const pretty = options.pretty ?? false;
  const validationRules = options.validationRules ?? [];
  const showGraphiQL = options.graphiql ?? false;

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res
        .status(405)
        .json(errorMessages(['GraphQL only supports GET and POST requests.']));
      return;
    }

    const { query, variables, operationName } = req.body;

    if (query == null) {
      if (showGraphiQL && req.method === 'GET') {
        return graphiqlHtml(req, res);
      }
      res.status(400).json(errorMessages(['Must provide query string.']));
      return;
    }

    const schemaValidationErrors = validateSchema(schema);
    if (schemaValidationErrors.length > 0) {
      // Return 500: Internal Server Error if invalid schema.
      res
        .status(500)
        .json(
          errorMessages(
            ['GraphQL schema validation error.'],
            schemaValidationErrors,
          ),
        );
      return;
    }

    let documentAST: DocumentNode;
    try {
      documentAST = parse(new Source(query, 'GraphQL request'));
    } catch (syntaxError: unknown) {
      // Return 400: Bad Request if any syntax errors errors exist.
      if (syntaxError instanceof Error) {
        console.error(`${syntaxError.stack || syntaxError.message}`);
        const e = new GraphQLError(syntaxError.message, {
          originalError: syntaxError,
        });
        res.status(400).json(errorMessages(['GraphQL syntax error.'], [e]));
        return;
      }
      throw syntaxError;
    }

    // Validate AST, reporting any errors.
    const validationErrors = validate(schema, documentAST, [
      ...specifiedRules,
      ...validationRules,
    ]);

    if (validationErrors.length > 0) {
      // Return 400: Bad Request if any validation errors exist.
      res
        .status(400)
        .json(errorMessages(['GraphQL validation error.'], validationErrors));
      return;
    }

    if (req.method === 'GET') {
      // Determine if this GET request will perform a non-query.
      const operationAST = getOperationAST(documentAST, operationName);
      if (operationAST && operationAST.operation !== 'query') {
        // Otherwise, report a 405: Method Not Allowed error.
        res
          .status(405)
          .json(
            errorMessages([
              `Can only perform a ${operationAST.operation} operation from a POST request.`,
            ]),
          );
        return;
      }
    }

    let result: FormattedExecutionResult;

    try {
      // Parse and validate the query
      const source = new Source(query, 'Mammoth Request');
      const document = parse(source);
      const validationErrors = validate(schema, document, specifiedRules);

      if (validationErrors.length > 0) {
        return handleValidationErrors(validationErrors, res);
      }

      // Prepare context and execute the query

      result = await execute({
        schema,
        document: documentAST,
        contextValue: options.context({ req, res }) as TContext,
        variableValues: variables,
        operationName: operationName,
      });
    } catch (contextError: unknown) {
      if (contextError instanceof Error) {
        console.error(`${contextError.stack || contextError.message}`);
        const e = new GraphQLError(contextError.message, {
          originalError: contextError,
          nodes: documentAST,
        });
        // Return 400: Bad Request if any execution context errors exist.
        res
          .status(400)
          .json(errorMessages(['GraphQL execution context error.'], [e]));
        return;
      }
      throw contextError;
    }

    if (!result.data) {
      if (result.errors) {
        res
          .status(500)
          .json(errorMessages([result.errors.toString()], result.errors));
        return;
      }
    }

    if (pretty) {
      const payload = JSON.stringify(result, null, pretty ? 2 : 0);
      res.status(200).send(payload);
      return;
    } else {
      res.json(result);
      return;
    }
  };
}

export const errorMessages = (
  messages: string[],
  graphqlErrors?: readonly GraphQLError[] | readonly GraphQLFormattedError[],
) => {
  if (graphqlErrors) {
    return {
      errors: graphqlErrors,
    };
  }

  return {
    errors: messages.map((message) => {
      return {
        message: message,
      };
    }),
  };
};
