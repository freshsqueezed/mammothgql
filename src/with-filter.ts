import { GraphQLResolveInfo } from 'graphql';

type FilterFn<TSource, TArgs, TContext> = (
  rootValue: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => boolean | Promise<boolean>;

type ResolverFn<TSource, TArgs, TContext> = (
  rootValue: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterator<any> | Promise<AsyncIterator<any>>;

type IterableResolverFn<TSource, TArgs, TContext> = (
  rootValue: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterableIterator<any> | Promise<AsyncIterableIterator<any>>;

interface IterallAsyncIterator<T> extends AsyncIterableIterator<T> {
  [Symbol.asyncIterator](): IterallAsyncIterator<T>;
}

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

    const getNextItem = async (): Promise<IteratorResult<any>> => {
      const { value, done } = await asyncIterator.next();

      if (done) {
        return { done, value: undefined };
      }

      const shouldInclude = await filterFn(value, args, context, info);

      return shouldInclude ? { done: false, value } : getNextItem();
    };

    const filteredIterator: IterallAsyncIterator<any> = {
      next() {
        return getNextItem();
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

    return filteredIterator;
  };
}
