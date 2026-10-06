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

test("department deletion succeeds when only the target and its child share a normalized name", async () => {
  const { DELETE } = await import(
    "../src/app/api/admin/departments/[id]/route"
  );
  const departments: DepartmentNode[] = [
    { id: "division", name: "Sales", parentId: null },
    { id: "team", name: " sales ", parentId: "division" },
  ];
  const assignments: Array<{ userId: string; departmentId: string | null }> = [
    { userId: "ana", departmentId: "division" },
    { userId: "ben", departmentId: "team" },
  ];

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
            const target = departments.find((department) => department.id === id);
            const childIds = departments
              .filter((department) => department.parentId === id)
              .map((department) => department.id);
            const targetIndex = departments.findIndex(
              (department) => department.id === id
            );
            departments.splice(targetIndex, 1);
            for (const department of departments) {
              if (childIds.includes(department.id)) {
                department.parentId = target?.parentId ?? null;
              }
            }
            for (const assignment of assignments) {
              if (assignment.departmentId === id) assignment.departmentId = null;
            }
            return true;
          },
        }),
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(departments, [
    { id: "team", name: " sales ", parentId: null },
  ]);
  assert.deepEqual(assignments, [
    { userId: "ana", departmentId: null },
    { userId: "ben", departmentId: "team" },
  ]);
});
