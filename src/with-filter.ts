// Define the type for the pubsub object
interface PubSub {
  asyncIterator: (trigger: string) => AsyncIterator<any>;
}

// Define the filter function type
export type FilterFn<TSource = any, TArgs = any, TContext = any> = (
  rootValue: TSource,
  args: TArgs,
  context: TContext,
  info: any,
) => boolean | Promise<boolean>;

// Define the resolver function type
export type ResolverFn<TSource = any, TArgs = any, TContext = any> = (
  rootValue: TSource,
  args: TArgs,
  context: TContext,
  info: any,
) => AsyncIterator<any> | Promise<AsyncIterator<any>>;

// Define the iterable resolver function type
export type IterableResolverFn<TSource = any, TArgs = any, TContext = any> = (
  rootValue: TSource,
  args: TArgs,
  context: TContext,
  info: any,
) => AsyncIterableIterator<any> | Promise<AsyncIterableIterator<any>>;

// The withFilter function type definition, expecting a context with pubsub
export type WithFilter<TSource = any, TArgs = any, TContext = any> = (
  asyncIteratorFn: ResolverFn<TSource, TArgs, TContext>,
  filterFn: FilterFn<TSource, TArgs, TContext>,
) => IterableResolverFn<TSource, TArgs, TContext>;

// Modify the withFilter function
export function withFilter<
  TSource = any,
  TArgs = any,
  TContext = { pubsub: PubSub },
>(
  asyncIteratorFn: ResolverFn<TSource, TArgs, TContext>,
  filterFn: FilterFn<TSource, TArgs, TContext>,
): IterableResolverFn<TSource, TArgs, TContext> {
  return async (
    rootValue,
    args,
    context: TContext, // Context will include pubsub here
    info,
  ): Promise<AsyncIterableIterator<any>> => {
    // Expect the context to have the pubsub property
    const asyncIterator = await asyncIteratorFn(rootValue, args, context, info);

    const next = async (): Promise<IteratorResult<any>> => {
      const payload = await asyncIterator.next();
      if (payload.done) return payload;

      const filterResult = await filterFn(payload.value, args, context, info);
      if (filterResult) {
        return payload;
      }

      // Recursively skip and try again with the next item
      return next();
    };

    // Return the AsyncIterableIterator directly
    const iterable: AsyncIterableIterator<any> = {
      next,
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

    return iterable;
  };
}
