import { Request, Response } from 'express';

export function graphiqlHtml(req: Request, res: Response) {
  const protocol = req.protocol;
  const host = req.get('host');
  const path = req.path;
  const fullUrl = `${protocol}://${host}${path}`;
  const wsProtocol = protocol === 'https' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${host}${path}`;

  res.send(`
<!--
// *  Copyright (c) 2024 GraphQL Contributors
// *  All rights reserved.
// *
// *  This source code is licensed under the license found in the
// *  LICENSE file in the root directory of this source tree.
// -->
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
        url: ${fullUrl},
        wsClient: graphqlWs.createClient({
          url: ${wsUrl}, 
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
      document.querySelector('.spinner').style.display = 'none';
    </script>
  </body>
</html>
  `);
}
