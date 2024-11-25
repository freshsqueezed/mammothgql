export function disabledLandingPage() {
  return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="description" content="GraphQL API endpoint">
          <title>GraphQL API</title>
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
            <h1>Mammoth GraphQL API</h1>
            <p>Welcome to the GraphQL API endpoint! You can interact with this API in a variety of ways:</p>
            <ul style="list-style-type: none; padding: 0;">
              <li>Enable GraphiQL to explore the API by navigating to: <code>/graphql</code>.</li>
              <li>Or use your favorite GraphQL client, such as Postman, Insomnia, or Apollo Studio, to send queries and mutations to: <strong>http://localhost:3000/graphql</strong></li>
            </ul>
          </div>
        </body>
      </html>
    `;
}
