import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { replaceDepartmentMembersMutation } from "../src/lib/department-mutations";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost/test";

test("empty member replacement returns 404 when deletion wins the hierarchy lock", async () => {
  const { PUT } = await import(
    "../src/app/api/admin/departments/[id]/members/route"
  );
  const events: string[] = [];
  const assignments = [{ id: "ana", departmentId: null }];

  const response = await PUT(
    new NextRequest("http://localhost/api/admin/departments/sales/members", {
      method: "PUT",
      body: JSON.stringify({ userIds: [] }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "sales" }) },
    {
      authorize: async () => true,
      replaceMembers: (departmentId: string, userIds: string[]) =>
        replaceDepartmentMembersMutation(departmentId, userIds, {
          listUsers: async () => assignments,
          replaceAtomically: async () => {
            events.push("lock-acquired-after-delete");
            return false;
          },
        }),
    }
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Department not found" });
  assert.deepEqual(events, ["lock-acquired-after-delete"]);
  assert.deepEqual(assignments, [{ id: "ana", departmentId: null }]);
});

test("member replacement maps a deleted-target foreign-key race to 404", async () => {
  const { PUT } = await import(
    "../src/app/api/admin/departments/[id]/members/route"
  );

  const response = await PUT(
    new NextRequest("http://localhost/api/admin/departments/sales/members", {
      method: "PUT",
      body: JSON.stringify({ userIds: ["ana"] }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "sales" }) },
    {
      authorize: async () => true,
      replaceMembers: (departmentId: string, userIds: string[]) =>
        replaceDepartmentMembersMutation(departmentId, userIds, {
          listUsers: async () => [{ id: "ana", departmentId: null }],
          replaceAtomically: async () => {
            throw Object.assign(new Error("foreign key violation"), {
              code: "23503",
            });
          },
        }),
    }
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Department not found" });
});
