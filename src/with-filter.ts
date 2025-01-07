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

export type WithFilter<TSource = any, TArgs = any, TContext = any> = (
  asyncIteratorFn: ResolverFn<TSource, TArgs, TContext>,
  filterFn: FilterFn<TSource, TArgs, TContext>,
) => IterableResolverFn<TSource, TArgs, TContext>;

export function withFilter<TSource = any, TArgs = any, TContext = any>(
  asyncIteratorFn: ResolverFn<TSource, TArgs, TContext>,
  filterFn: FilterFn<TSource, TArgs, TContext>,
): IterableResolverFn<TSource, TArgs, TContext> {
  return async (
    rootValue,
    args,
    context,
    info,
  ): Promise<AsyncIterableIterator<any>> => {
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

    // Return the AsyncIterableIterator directly, wrapping in Promise.resolve() when done
    const iterable: AsyncIterableIterator<any> = {
      next,
      return() {
        // Ensure return is always a Promise of IteratorResult
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
