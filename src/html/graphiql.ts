export function graphiqlHtml() {
  return `
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
        display: flex;
        justify-content: center;
        align-items: center;
      }

      /* Spinner Styles */
      .spinner {
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
      }

      /* Spinner animation */
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    </style>
    <!-- React and React DOM -->
    <script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js" crossorigin="anonymous"></script>

    <!-- GraphiQL and Plugin -->
    <script src="https://unpkg.com/graphiql/graphiql.min.js" crossorigin="anonymous"></script>
    <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
    <script src="https://unpkg.com/@graphiql/plugin-explorer/dist/index.umd.js" crossorigin="anonymous"></script>
    <link rel="stylesheet" href="https://unpkg.com/@graphiql/plugin-explorer/dist/style.css" />

    <!-- GraphQL WS Client for Subscriptions -->
    <script src="https://unpkg.com/graphql-ws@5.11.0/umd/graphql-ws.min.js"></script>
  </head>

  <body>
    <div id="graphiql">
      <div class="spinner"></div> <!-- Spinner element -->
    </div>

    <script>
      window.onload = () => {
        const root = ReactDOM.createRoot(document.getElementById('graphiql'));
        
        // HTTP and WebSocket fetcher configuration
        const fetcher = GraphiQL.createFetcher({
          url: 'http://localhost:3000/graphql',
          wsClient: graphqlWs.createClient({
            url: 'ws://localhost:3000/graphql',
          }),
        });
        
        const explorerPlugin = GraphiQLPluginExplorer.explorerPlugin();
        
        // Rendering GraphiQL
        root.render(
          React.createElement(GraphiQL, {
            fetcher,
            defaultEditorToolsVisibility: true,
            plugins: [explorerPlugin],
          }),
        );

        // Hide the spinner once GraphiQL has loaded
        document.querySelector('.spinner').style.display = 'none';
      };
    </script>
  </body>
</html>
  `;
}
