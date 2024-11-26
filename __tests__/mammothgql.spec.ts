import request from 'supertest';
import express, { json } from 'express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import mammothGraphql from '..';

const testSchema = makeExecutableSchema({
  typeDefs: `#graphql
    type Query {
      hello: String
    }
  `,
  resolvers: {
    Query: {
      hello: () => 'world',
    },
  },
});

describe('mammothGraphql Middleware', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(json());
    app.use(
      '/graphql',
      mammothGraphql({
        schema: testSchema,
        graphiql: true,
        context: () => ({}),
      }),
    );
  });

  it('should return a hello message', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: `#graphql
          {
            hello
          }
        `,
      });

    // Ensure correct response structure and values
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('hello');
    expect(response.body.data.hello).toBe('world');
  });
});
