# `@freshsqueezed/mammothgql`

## A TypeScript/JavaScript GraphQL middleware for `express`

## Getting started: Express middleware

Mammoth GQL enables the ability to add middleware that lets you run your GraphQL server as part of an app built with Express, one of the most popular web frameworks for Node.

First, install MammothGQL Middlewate, the JavaScript implementation of the core GraphQL algorithms, Express, and two common Express middleware packages:

```
npm install @afreshsqueezed/mammothgql graphql express cors
```

Then, write the following to server.mjs. (By using the .mjs extension, Node lets you use the await keyword at the top level.)

```js
import express, { json } from 'express';
import cors from 'cors';
import mammothGql from '@freshsqueezed/mammothgql';
import schema from './graphql';

const app = express();

app.use(cors());
app.use(json());
app.use(
  '/graphql',
  mammothGql({
    schema,
    graphiql: true,
    context: ({ req }) => ({
      user: req.user || null,
    }),
  }),
);

export default app;
```

Now run your server with:

```
node server.mjs
```

Open the URL it prints in a web browser. It will show GraphiQL, a web-based tool for running GraphQL operations. Try running the operation `query { hello }`!
