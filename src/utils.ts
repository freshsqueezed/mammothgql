import { Response } from 'express';
import { GraphQLError } from 'graphql';

// Handle GraphQL validation errors
export function handleValidationErrors(
  validationErrors: readonly GraphQLError[],
  res: Response,
) {
  const formattedErrors = (validationErrors as GraphQLError[]).map((err) => ({
    message: err.message,
    locations: err.locations,
    path: err.path,
    extensions: err.extensions || { code: 'GRAPHQL_VALIDATION_FAILED' },
  }));

  res.status(400).json({ errors: formattedErrors });
}

// Format execution errors for the response
export function formatExecutionErrors(errors: readonly GraphQLError[]) {
  return (errors as GraphQLError[]).map((error) => ({
    message:
      process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : error.message,
    locations: error.locations,
    path: error.path,
    extensions: error.extensions || { code: 'INTERNAL_SERVER_ERROR' },
  }));
}
