import test from "node:test";
import assert from "node:assert/strict";
import { deleteDepartmentMutation } from "../src/lib/department-mutations";
import type { DepartmentNode } from "../src/lib/departments";

test("department deletion returns 409 without mutating assignments or children on promotion conflict", async () => {
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

  const result = await deleteDepartmentMutation("division", {
    listDepartments: async () => departments,
    deleteAtomically: async () => {
      transactionCalls += 1;
      assignments[0].departmentId = null;
      departments[2].parentId = null;
      return true;
    },
  });

  assert.equal(result.status, 409);
  assert.deepEqual(result.body, {
    error:
      "Cannot delete department because promoting its children would create duplicate sibling names",
  });
  assert.equal(transactionCalls, 0);
  assert.deepEqual(assignments, originalAssignments);
  assert.deepEqual(departments, originalDepartments);
});
