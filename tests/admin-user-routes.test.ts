import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import { canManageAllowedUsers } from "../src/lib/admin-authorization";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost/test";

async function createHandlersFor(email: string) {
  const [collectionRoute, memberRoute] = await Promise.all([
    import("../src/app/api/admin/users/route"),
    import("../src/app/api/admin/users/[id]/route"),
  ]);
  const calls = { get: 0, post: 0, delete: 0, patch: 0 };
  const authorization = {
    getSessionEmail: async () => email,
    canManageAllowedUsers,
  };

  return {
    calls,
    collectionRoute,
    memberRoute,
    collectionDependencies: {
      authorization,
      operations: {
        get: async () => {
          calls.get += 1;
          return NextResponse.json({ ok: true });
        },
        post: async () => {
          calls.post += 1;
          return NextResponse.json({ ok: true });
        },
      },
    },
    memberDependencies: {
      authorization,
      operations: {
        delete: async () => {
          calls.delete += 1;
          return NextResponse.json({ ok: true });
        },
        patch: async () => {
          calls.patch += 1;
          return NextResponse.json({ ok: true });
        },
      },
    },
  };
}

const request = new NextRequest("http://localhost/api/admin/users/test-user");
const context = { params: Promise.resolve({ id: "test-user" }) };
const collectionContext = { params: Promise.resolve({}) };

test("actual allowed-user route handlers deny every regular-admin operation", async () => {
  const handlers = await createHandlersFor("regular-admin@example.com");

  const responses = await Promise.all([
    handlers.collectionRoute.GET(
      request,
      collectionContext,
      handlers.collectionDependencies
    ),
    handlers.collectionRoute.POST(
      request,
      collectionContext,
      handlers.collectionDependencies
    ),
    handlers.memberRoute.DELETE(request, context, handlers.memberDependencies),
    handlers.memberRoute.PATCH(request, context, handlers.memberDependencies),
  ]);

  assert.deepEqual(
    responses.map((response) => response.status),
    [403, 403, 403, 403]
  );
  assert.equal(responses.every((response) => response instanceof NextResponse), true);
  assert.deepEqual(
    await Promise.all(responses.map((response) => response.json())),
    Array.from({ length: 4 }, () => ({ error: "Forbidden" }))
  );
  assert.deepEqual(handlers.calls, { get: 0, post: 0, delete: 0, patch: 0 });
});

test("actual allowed-user route handlers allow every superadmin operation", async () => {
  const handlers = await createHandlersFor("nucup53@gmail.com");

  const responses = await Promise.all([
    handlers.collectionRoute.GET(
      request,
      collectionContext,
      handlers.collectionDependencies
    ),
    handlers.collectionRoute.POST(
      request,
      collectionContext,
      handlers.collectionDependencies
    ),
    handlers.memberRoute.DELETE(request, context, handlers.memberDependencies),
    handlers.memberRoute.PATCH(request, context, handlers.memberDependencies),
  ]);

  assert.deepEqual(
    responses.map((response) => response.status),
    [200, 200, 200, 200]
  );
  assert.equal(responses.every((response) => response instanceof NextResponse), true);
  assert.deepEqual(handlers.calls, { get: 1, post: 1, delete: 1, patch: 1 });
});
