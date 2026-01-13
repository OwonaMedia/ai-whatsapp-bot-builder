/* eslint-disable @typescript-eslint/no-explicit-any */

const noopAsync = async () => ({ data: null, error: null });
const noopAuthUser = async () => ({ data: { user: null }, error: null });
const noopAuthSession = async () => ({ data: { session: null }, error: null });

type QueryResult = { data: any; error: any };

function createResolvedResult(): QueryResult {
  return { data: null, error: null };
}

function createQueryBuilder(): any {
  let result: QueryResult = createResolvedResult();

  const builder: any = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    single: () => builder,
    maybeSingle: () => builder,
    limit: () => builder,
    order: () => builder,
    eq: () => builder,
    neq: () => builder,
    gte: () => builder,
    lte: () => builder,
    in: () => builder,
    contains: () => builder,
    not: () => builder,
    match: () => builder,
    range: () => builder,
    textSearch: () => builder,
    then(onFulfilled?: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
    catch(onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(result).catch(onRejected);
    },
    finally(onFinally?: () => void) {
      return Promise.resolve(result).finally(onFinally);
    },
  };

  return builder;
}

export function createSupabaseStub(): any {
  const builder = createQueryBuilder();

  return {
    auth: {
      getUser: noopAuthUser,
      getSession: noopAuthSession,
      signInWithOtp: noopAsync,
      verifyOtp: noopAsync,
      resetPasswordForEmail: noopAsync,
      exchangeCodeForSession: noopAsync,
      updateUser: noopAsync,
      signOut: noopAsync,
      resend: noopAsync,
      signUp: noopAsync,
      signInWithPassword: noopAsync,
    },
    channel: () => ({
      on: () => ({
        subscribe: async () => ({ data: null, error: null }),
      }),
    }),
    removeChannel: () => {},
    getChannels: () => [],
    from: () => createQueryBuilder(),
    rpc: noopAsync,
    storage: {
      from: () => ({
        upload: noopAsync,
        remove: noopAsync,
        download: noopAsync,
      }),
    },
  };
}


