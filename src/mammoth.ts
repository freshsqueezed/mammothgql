import { Request, Response } from 'express';
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
  ValidationRule,
  GraphQLFormattedError,
} from 'graphql';

interface MammothOptions<TContext extends MammothContext> {
  schema: GraphQLSchema;
  context: ({ req, res }: { req: Request; res: Response }) => TContext;
  pretty?: boolean;
  graphiql?: boolean;
  validationRules?: ValidationRule[];
}

interface MammothContext {
  req: Request;
  res: Response;
}

export function mammothGraphql<TContext extends MammothContext>(
  options: MammothOptions<TContext>,
) {
  const {
    schema,
    pretty = false,
    graphiql: showGraphiQL = false,
    validationRules = [],
  } = options;

  return async (req: Request, res: Response): Promise<void> => {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res
        .status(405)
        .json(
          createErrorMessages(['GraphQL only supports GET and POST requests.']),
        );
      return;
    }

    const { query, variables, operationName } = req.body;

    const cookies = req.headers.cookie || '';

    if (!query) {
      if (showGraphiQL && req.method === 'GET') {
        graphiqlHtml(req, res, cookies);
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
      const result = (await execute({
        schema,
        document: documentAST,
        contextValue: options.context({ req, res }),
        variableValues: variables,
        operationName,
      })) as FormattedExecutionResult;

      if (result.errors && result.errors.length > 0) {
        // If there are errors, handle them properly
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
      });
      res
        .status(500)
        .json(
          createErrorMessages(['GraphQL execution error.'], [graphQLError]),
        );
    }
  };
}

const createErrorMessages = (
  messages: string[],
  graphqlErrors?: readonly GraphQLError[] | readonly GraphQLFormattedError[],
) => ({
  errors: graphqlErrors ?? messages.map((message) => ({ message })),
});

export function graphiqlHtml(req: Request, res: Response, cookies: string) {
  const protocol = req.protocol;
  const host = req.get('host');
  const path = req.path;
  const fullUrl = `${protocol}://${host}${path}graphql`;
  const wsProtocol = protocol === 'https' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${host}${path}graphql`;

  res.send(`<!--
*  Copyright (c) 2021 GraphQL Contributors
*  All rights reserved.
*
*  This source code is licensed under the license found in the
*  LICENSE file in the root directory of this source tree.
-->
<!doctype html>
<html lang="en">
  <head>
    <title>GraphiQL</title>
    <style>
      body {
        height: 100%;
        margin: 0;
        width: 100%;
        overflow: hidden;
      }

      #graphiql {
        height: 100vh;
      }
    </style>
    <script
      crossorigin
      src="https://unpkg.com/react@18/umd/react.development.js"
    ></script>
    <script
      crossorigin
      src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"
    ></script>
    <script
      src="https://unpkg.com/graphiql/graphiql.min.js"
      type="application/javascript"
    ></script>
    <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
    <script
      src="https://unpkg.com/@graphiql/plugin-explorer/dist/index.umd.js"
      crossorigin
    ></script>
    <link
      rel="stylesheet"
      href="https://unpkg.com/@graphiql/plugin-explorer/dist/style.css"
    />
    <script src="https://unpkg.com/graphql-ws@5.11.0/umd/graphql-ws.min.js"></script>
  </head>

  <body>
    <div id="graphiql">
      <div class="spinner"></div> <!-- Spinner element -->
    </div>

    <script>
      const root = ReactDOM.createRoot(document.getElementById('graphiql'));
      const fetcher = GraphiQL.createFetcher({
        url: "${fullUrl}",
        wsClient: graphqlWs.createClient({
          url: "${wsUrl}",
        }),
        fetch: (url, options) => {
          options = {
            ...options,
            credentials: 'include', // Ensure cookies are included for same-origin requests
            headers: {
              ...options.headers,
              'Cookie': '${cookies}', // Send cookies to the server with the request
            },
          };
          return fetch(url, options);
        },
      });
      const explorerPlugin = GraphiQLPluginExplorer.explorerPlugin();
      
      root.render(
        React.createElement(GraphiQL, {
          fetcher,
          defaultEditorToolsVisibility: true,
          plugins: [explorerPlugin],
        })
      );
      document.querySelector('.spinner').style.display = 'none';
    </script>
  </body>
</html>
  `);
}
