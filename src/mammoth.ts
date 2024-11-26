import { NextFunction, Request, Response } from 'express';
import {
  ExecutionResult,
  GraphQLSchema,
  parse,
  Source,
  specifiedRules,
  validate,
} from 'graphql';
import { InternalServerError, ValidationError } from './errors';
import { formatExecutionErrors, handleValidationErrors } from './utils';
import { executeQuery } from './query';
import { customLandingHtml, disabledLandingPage, graphiqlHtml } from './html';

export interface MammothOptions<TContext> {
  schema: GraphQLSchema;
  context: ({ req, res }: { req: Request; res: Response }) => TContext;
  graphiql?: boolean;
}

export function mammothGraphql<TContext>({
  schema,
  context,
  graphiql = false,
}: MammothOptions<TContext>) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!graphiql) {
      res.send(disabledLandingPage());
      return;
    }

    if (graphiql && req.method === 'GET') {
      if (process.env.NODE_ENV !== 'production') {
        res.send(graphiqlHtml());
      } else {
        res.send(customLandingHtml());
      }
      return;
    }

    const { query, variables } = req.body;

    if (!query) {
      res
        .status(400)
        .json({ errors: [new ValidationError('No query provided')] });
      return;
    }

    try {
      // Parse and validate the query
      const source = new Source(query, 'Mammoth Request');
      const document = parse(source);
      const validationErrors = validate(schema, document, specifiedRules);

      if (validationErrors.length > 0) {
        return handleValidationErrors(validationErrors, res);
      }

      // Prepare context and execute the query
      const contextValue: TContext = context({ req, res });
      const executionResult: ExecutionResult = await executeQuery(
        schema,
        document,
        contextValue,
        variables,
      );

      // Handle errors in the execution result
      if (executionResult.errors && executionResult.errors.length > 0) {
        console.error('GraphQL Errors:', executionResult.errors);

        const responseErrors = formatExecutionErrors(executionResult.errors);
        res.status(200).json({ data: null, errors: responseErrors });
        return;
      }

      // Return the successful response
      res.status(200).json({
        data: executionResult.data,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error('Server Error:', error);

      const message =
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred.'
          : error instanceof Error
            ? error.message
            : String(error);

      res.status(500).json({ errors: [new InternalServerError(message)] });
    } finally {
      next();
    }
  };
}
