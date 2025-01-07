import { GraphQLResolveInfo } from 'graphql';

export type FilterFn<TSource, TArgs, TContext> = (
  rootValue: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo, // More specific typing for the info object
) => boolean | Promise<boolean>;

export type ResolverFn<TSource, TArgs, TContext> = (
  rootValue: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterator<any> | Promise<AsyncIterator<any>>;

export type IterableResolverFn<TSource, TArgs, TContext> = (
  rootValue: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterableIterator<any> | Promise<AsyncIterableIterator<any>>;

interface IterallAsyncIterator<T> extends AsyncIterableIterator<T> {
  [Symbol.asyncIterator](): IterallAsyncIterator<T>;
}

export type WithFilter<TSource, TArgs, TContext> = (
  asyncIteratorFn: ResolverFn<TSource, TArgs, TContext>,
  filterFn: FilterFn<TSource, TArgs, TContext>,
) => IterableResolverFn<TSource, TArgs, TContext>;

export function withFilter<TSource, TArgs, TContext>(
  asyncIteratorFn: ResolverFn<TSource, TArgs, TContext>,
  filterFn: FilterFn<TSource, TArgs, TContext>,
): IterableResolverFn<TSource, TArgs, TContext> {
  return async (
    rootValue: TSource,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
  ): Promise<IterallAsyncIterator<any>> => {
    const asyncIterator = await asyncIteratorFn(rootValue, args, context, info);

    const getNextPromise = () => {
      return new Promise<IteratorResult<any>>((resolve, reject) => {
        const inner = () => {
          asyncIterator
            .next()
            .then((payload) => {
              if (payload.done === true) {
                resolve(payload);
                return;
              }
              // Handle filterFn and ensure errors are ignored
              Promise.resolve(filterFn(payload.value, args, context, info))
                .catch(() => false) // Ignore errors from the filter function
                .then((filterResult) => {
                  if (filterResult === true) {
                    resolve(payload);
                    return;
                  }
                  // Recursively skip to the next item if the filter fails
                  inner();
                });
            })
            .catch((err) => {
              reject(err);
            });
        };

        inner();
      });
    };

    const asyncIterator2: IterallAsyncIterator<any> = {
      next() {
        return getNextPromise();
      },
      return() {
        return asyncIterator.return
          ? asyncIterator.return()
          : Promise.resolve({ done: true, value: undefined });
      },
      throw(error) {
        return asyncIterator.throw
          ? asyncIterator.throw(error)
          : Promise.reject(error);
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };

    return asyncIterator2;
  };
}
