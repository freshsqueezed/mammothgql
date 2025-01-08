import request from 'supertest';
import express, { json } from 'express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { MammothBaseContext, mammothGraphql } from '../src';

const testSchema = makeExecutableSchema({
  typeDefs: `#graphql
    type Query {
      hello(s: String!): String
    }
  `,
  resolvers: {
    Query: {
      hello: (_: unknown, { s }: { s: string }) => s,
    },
  },
});

describe('mammothGraphql Middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(json());

    interface ServerContext extends MammothBaseContext {
      userId?: string;
    }

    app.use(
      '/graphql',
      mammothGraphql<ServerContext>({
        schema: testSchema,
        graphiql: true,
        context: () => ({}),
      }),
    );
  });

  it('should return a valid response with the correct data', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: 'query Hello($s: String!) { hello(s: $s) }',
        variables: {
          s: 'world!',
        },
      })
      .expect(200);

    expect(response.body.data).toEqual({
      hello: 'world!',
    });

    expect(response.body.errors).toBeUndefined();
  });

  it('should return an error for missing required variable in the query', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: 'query Hello($s: String!) { hello(s: $s) }',
      })
      .expect(400);

    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].message).toContain(
      'Variable "$s" of required type "String!" was not provided.',
    );
  });

  it('should serve the GraphiQL interface when graphiql is true', async () => {
    const response = await request(app).get('/graphql').expect(200);

    expect(response.text).toContain('<title>Mammoth GraphiQL</title>');
  });

  it('should return a 404 for a non-existent GraphQL endpoint', async () => {
    const response = await request(app)
      .get('/non-existent-endpoint')
      .expect(404);

    expect(response.status).toBe(404);
  });
});
