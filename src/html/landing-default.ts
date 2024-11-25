export function customLandingHtml() {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="description" content="Send GraphQL queries directly to the endpoint.">
        <title>Apollo Studio GraphQL Endpoint</title>
        <style>
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f4f4f9;
            color: #333;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
          }
          .container {
            max-width: 600px;
            padding: 20px;
            background-color: #fff;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
          }
          h1 {
            color: #2f80ed;
            font-size: 2.5rem;
            margin-bottom: 1rem;
          }
          p {
            font-size: 1.2rem;
            margin-bottom: 1.5rem;
            line-height: 1.6;
          }
          .endpoint {
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            word-break: break-all;
            margin-bottom: 20px;
          }
          .btn {
            background-color: #2f80ed;
            color: white;
            padding: 10px 20px;
            font-size: 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
          }
          .btn:hover {
            background-color: #1c60b3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Mammoth GraphQL</h1>
          <p>Welcome to the GraphQL endpoint. You can send your queries and mutations directly to the following URL:</p>
          <div class="endpoint">http://localhost:3000/graphql</div>
          <p>To interact with this GraphQL API, use your favorite GraphQL client.</p>
        </div>
      </body>
    </html>
  `;
}
