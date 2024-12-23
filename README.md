[![@freshsqueezed/mammothgql](https://github.com/freshsqueezed/mammothgql/actions/workflows/release-package.yml/badge.svg)](https://github.com/freshsqueezed/mammothgql/actions/workflows/release-package.yml)

# `@freshsqueezed/mammothgql`

## A TypeScript/JavaScript GraphQL middleware for `express`

## Getting started: Express middleware

Mammoth GQL enables the ability to run your GraphQL middleware as part of an app built with Express, one of the most popular web frameworks for Node.

First, install MammothGQL Middleware, the JavaScript implementation of the core GraphQL algorithms, Express, and two common Express middleware packages:

```
npm install @freshsqueezed/mammothgql graphql @graphql-tools/schema express cors
```

Then, write the following to `./src/app.ts`.

```ts
import express, { json } from 'express';
import cors, { CorsRequest } from 'cors';
import { mammothGraphql } from '@freshsqueezed/mammothgql';
import schema from './graphql';
import { ServerContext } from './types';

const schema = makeExecutableSchema({
  typeDefs: `#graphql
    type Query {
      hello(s: String!): String
    }
  `,
  resolvers: {
    Query: {
      hello: (_: never, { s }: { s: string }) => s,
    },
  },
});

const app = express();

app.use(cors<CorsRequest>());
app.use(json());

app.use(
  '/graphql',
  mammothGraphql<ServerContext>({
    schema,
    graphiql: true,
    context: ({ req }) => ({
      user: req.user || null,
    }),
  }),
);

export default app;
```

Create a `./src/index.ts` file and

```ts
import { createServer } from 'node:http';
import app from './app';

const httpServer = createServer(app);

httpServer.listen(3000, () => {
  console.log(`
🚀 Server is running on http://localhost:${PORT}/graphql
  `);
});
```

Now run your server with:

```
ts-node ./src/index.ts
```

Open the URL it prints in a web browser. It will show GraphiQL, a web-based tool for running GraphQL operations. Try running the operation `query { hello(s: "world!") }`!
