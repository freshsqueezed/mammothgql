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
      hello: (_: never, { s }: { s: string }) => s,
    },
  },
});

describe('mammothGraphql Middleware', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(json());

    interface ServerContext extends MammothBaseContext {
      user?: any;
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

  it('should return a valid response', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: 'query Hello($s: String!) { hello(s: $s) }',
        variables: { s: 'normally encoded' },
      })
      .expect(200);

    expect(response.body.data).toEqual({
      hello: 'normally encoded',
    });
  });

  it('should serve the GraphiQL interface when graphiql is true', async () => {
    const response = await request(app).get('/graphql').expect(200);

    expect(response.text).toContain('<title>Mammoth GraphiQL</title>');
  });
});
