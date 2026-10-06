import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import { deleteDepartmentMutation } from "../src/lib/department-mutations";
import type { DepartmentNode } from "../src/lib/departments";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost/test";

test("department deletion returns 409 without mutating assignments or children on promotion conflict", async () => {
  const { DELETE } = await import(
    "../src/app/api/admin/departments/[id]/route"
  );
  const departments: DepartmentNode[] = [
    { id: "existing-sales", name: "Sales", parentId: null },
    { id: "division", name: "Division", parentId: null },
    { id: "promoted-sales", name: "sales", parentId: "division" },
  ];
  const assignments: Array<{ userId: string; departmentId: string | null }> = [
    { userId: "ana", departmentId: "division" },
    { userId: "ben", departmentId: "promoted-sales" },
  ];
  const originalDepartments = structuredClone(departments);
  const originalAssignments = structuredClone(assignments);
  let transactionCalls = 0;

  const response = await DELETE(
    new NextRequest("http://localhost/api/admin/departments/division", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: "division" }) },
    {
      authorize: async () => true,
      deleteDepartment: (id: string) =>
        deleteDepartmentMutation(id, {
          listDepartments: async () => departments,
          deleteAtomically: async () => {
            transactionCalls += 1;
            assignments[0].departmentId = null;
            departments[2].parentId = null;
            return true;
          },
        }),
    },
  );

  assert.equal(response.status, 409);
  assert.equal(response instanceof NextResponse, true);
  assert.deepEqual(await response.json(), {
    error:
      "Cannot delete department because promoting its children would create duplicate sibling names",
  });
  assert.equal(transactionCalls, 0);
  assert.deepEqual(assignments, originalAssignments);
  assert.deepEqual(departments, originalDepartments);
});
