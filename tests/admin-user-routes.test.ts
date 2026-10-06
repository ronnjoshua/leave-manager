import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { canManageAllowedUsers } from "../src/lib/admin-authorization";
import {
  createAllowedUserRouteHandlers,
  createAllowedUsersRouteHandlers,
} from "../src/lib/admin-user-route-handlers";

async function createHandlersFor(email: string) {
  const calls = { get: 0, post: 0, delete: 0, patch: 0 };
  const authorization = {
    getSessionEmail: async () => email,
    canManageAllowedUsers,
  };

  return {
    calls,
    collection: createAllowedUsersRouteHandlers(authorization, {
      get: async () => {
        calls.get += 1;
        return Response.json({ ok: true });
      },
      post: async () => {
        calls.post += 1;
        return Response.json({ ok: true });
      },
    }),
    member: createAllowedUserRouteHandlers(authorization, {
      delete: async () => {
        calls.delete += 1;
        return Response.json({ ok: true });
      },
      patch: async () => {
        calls.patch += 1;
        return Response.json({ ok: true });
      },
    }),
  };
}

const request = new NextRequest("http://localhost/api/admin/users/test-user");
const context = { params: Promise.resolve({ id: "test-user" }) };

test("actual allowed-user route handlers deny every regular-admin operation", async () => {
  const handlers = await createHandlersFor("regular-admin@example.com");

  const responses = await Promise.all([
    handlers.collection.GET(),
    handlers.collection.POST(request),
    handlers.member.DELETE(request, context),
    handlers.member.PATCH(request, context),
  ]);

  assert.deepEqual(
    responses.map((response) => response.status),
    [403, 403, 403, 403]
  );
  assert.deepEqual(
    await Promise.all(responses.map((response) => response.json())),
    Array.from({ length: 4 }, () => ({ error: "Forbidden" }))
  );
  assert.deepEqual(handlers.calls, { get: 0, post: 0, delete: 0, patch: 0 });
});

test("actual allowed-user route handlers allow every superadmin operation", async () => {
  const handlers = await createHandlersFor("nucup53@gmail.com");

  const responses = await Promise.all([
    handlers.collection.GET(),
    handlers.collection.POST(request),
    handlers.member.DELETE(request, context),
    handlers.member.PATCH(request, context),
  ]);

  assert.deepEqual(
    responses.map((response) => response.status),
    [200, 200, 200, 200]
  );
  assert.deepEqual(handlers.calls, { get: 1, post: 1, delete: 1, patch: 1 });
});
