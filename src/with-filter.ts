export type FilterFn<TSource = any, TArgs = any, TContext = any> = (
  rootValue: TSource,
  args: TArgs,
  context: TContext,
  info: any,
) => boolean | Promise<boolean>;

export type ResolverFn<TSource = any, TArgs = any, TContext = any> = (
  rootValue: TSource,
  args: TArgs,
  context: TContext,
  info: any,
) => AsyncIterator<any> | Promise<AsyncIterator<any>>;

export type IterableResolverFn<TSource = any, TArgs = any, TContext = any> = (
  rootValue: TSource,
  args: TArgs,
  context: TContext,
  info: any,
) => AsyncIterableIterator<any> | Promise<AsyncIterableIterator<any>>;

interface IterallAsyncIterator<T> extends AsyncIterableIterator<T> {
  [Symbol.asyncIterator](): IterallAsyncIterator<T>;
}

export type WithFilter<TSource = any, TArgs = any, TContext = any> = (
  asyncIteratorFn: ResolverFn<TSource, TArgs, TContext>,
  filterFn: FilterFn<TSource, TArgs, TContext>,
) => IterableResolverFn<TSource, TArgs, TContext>;

export function withFilter<TSource = any, TArgs = any, TContext = any>(
  asyncIteratorFn: ResolverFn<TSource, TArgs, TContext>,
  filterFn: FilterFn<TSource, TArgs, TContext>,
): IterableResolverFn<TSource, TArgs, TContext> {
  return async (
    rootValue: TSource,
    args: TArgs,
    context: TContext,
    info: any,
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
              Promise.resolve(filterFn(payload.value, args, context, info))
                .catch(() => false) // We ignore errors from filter function
                .then((filterResult) => {
                  if (filterResult === true) {
                    resolve(payload);
                    return;
                  }
                  // Skip the current value and wait for the next one
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
