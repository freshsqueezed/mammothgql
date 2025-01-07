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

export interface MammothBaseContext {
  req: Request;
  res: Response;
}

interface MammothOptions<ServerContext extends MammothBaseContext> {
  schema: GraphQLSchema;
  context: (args: MammothBaseContext) => Partial<ServerContext>;
  pretty?: boolean;
  graphiql?: boolean;
  validationRules?: ValidationRule[];
}

export function mammothGraphql<
  ServerContext extends MammothBaseContext = MammothBaseContext,
>(options: MammothOptions<ServerContext>) {
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
      const contextValue = {
        req,
        res,
        ...options.context({ req, res }),
      } as ServerContext;

      const result = await execute({
        schema,
        document: documentAST,
        contextValue,
        variableValues: variables,
        operationName,
      });

      if (result.errors) {
        res.status(400).json(
          createErrorMessages(
            result.errors.map((err) => err.message),
            result.errors,
          ),
        );
        return;
      }

      res.status(200).json(pretty ? JSON.stringify(result, null, 2) : result);
    } catch (err: unknown) {
      const executionError =
        err instanceof Error ? err : new Error('Unknown execution error');
      res.status(500).json(createErrorMessages([executionError.message]));
    }
  };
}

function createErrorMessages(
  messages: string[],
  errors?: ReadonlyArray<GraphQLFormattedError>,
): FormattedExecutionResult {
  return {
    data: null,
    errors: errors || messages.map((msg) => ({ message: msg })),
  };
}

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
    <title>Mammoth GraphiQL</title>
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

      .spinner {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        width: 100vw;
        font-size: 24px;
        color: #333;
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
      <div class="spinner">Loading GraphiQL...</div>
    </div>

    <script>
      const root = ReactDOM.createRoot(document.getElementById('graphiql'));

      const fetcher = GraphiQL.createFetcher({
        url: "${fullUrl}",
        wsClient: graphqlWs.createClient({
          url: "${wsUrl}",
        }),
      });

      const explorerPlugin = GraphiQLPluginExplorer.explorerPlugin();
      
      root.render(
        React.createElement(GraphiQL, {
          fetcher,
          defaultEditorToolsVisibility: true,
          plugins: [explorerPlugin],
        })
      );

      // Hide the spinner once GraphiQL is rendered
      document.querySelector('.spinner').style.display = 'none';
    </script>
  </body>
</html>
  `);
}
