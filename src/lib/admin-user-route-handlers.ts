import { NextResponse } from "next/server";

export type AllowedUserAuthorizationDependencies = {
  getSessionEmail: () => Promise<string | null | undefined>;
  canManageAllowedUsers: (email: string | null | undefined) => boolean;
};

type AsyncRoute<TArgs extends unknown[]> = (
  ...args: TArgs
) => Promise<Response>;

function authorize<TArgs extends unknown[]>(
  authorization: AllowedUserAuthorizationDependencies,
  operation: AsyncRoute<TArgs>
): AsyncRoute<TArgs> {
  return async (...args) => {
    const email = await authorization.getSessionEmail();
    if (!authorization.canManageAllowedUsers(email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return operation(...args);
  };
}

export function createAllowedUsersRouteHandlers<TRequest>(
  authorization: AllowedUserAuthorizationDependencies,
  operations: {
    get: AsyncRoute<[]>;
    post: AsyncRoute<[TRequest]>;
  }
) {
  return {
    GET: authorize(authorization, operations.get),
    POST: authorize(authorization, operations.post),
  };
}

export function createAllowedUserRouteHandlers<TRequest, TContext>(
  authorization: AllowedUserAuthorizationDependencies,
  operations: {
    delete: AsyncRoute<[TRequest, TContext]>;
    patch: AsyncRoute<[TRequest, TContext]>;
  }
) {
  return {
    DELETE: authorize(authorization, operations.delete),
    PATCH: authorize(authorization, operations.patch),
  };
}
