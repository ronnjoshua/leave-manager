import test from "node:test";
import assert from "node:assert/strict";
import {
  groupUsersByDepartment,
  sortDepartmentsForDisplay,
  type DepartmentUser,
} from "../src/lib/admin-department-ui";
import type { DepartmentNode } from "../src/lib/departments";

const departments: DepartmentNode[] = [
  { id: "security", name: "Security", parentId: "engineering" },
  { id: "sales", name: "Sales", parentId: null },
  { id: "developer-experience", name: "Developer Experience", parentId: "platform" },
  { id: "engineering", name: "Engineering", parentId: null },
  { id: "platform", name: "Platform", parentId: "engineering" },
];

test("orders departments depth-first with alphabetical siblings", () => {
  assert.deepEqual(
    sortDepartmentsForDisplay(departments).map(({ department, depth }) => ({
      id: department.id,
      depth,
    })),
    [
      { id: "engineering", depth: 0 },
      { id: "platform", depth: 1 },
      { id: "developer-experience", depth: 2 },
      { id: "security", depth: 1 },
      { id: "sales", depth: 0 },
    ]
  );
});

test("groups employees by their sole current department and keeps unassigned employees", () => {
  const users: DepartmentUser[] = [
    {
      id: "zoe",
      email: "zoe@example.com",
      isAdmin: false,
      departmentId: "platform",
    },
    {
      id: "ana",
      email: "ana@example.com",
      isAdmin: false,
      departmentId: null,
    },
    {
      id: "ben",
      email: "ben@example.com",
      isAdmin: true,
      departmentId: "platform",
    },
  ];

  const groups = groupUsersByDepartment(users);

  assert.deepEqual(
    groups.get("platform")?.map((user) => user.id),
    ["ben", "zoe"]
  );
  assert.deepEqual(
    groups.get(null)?.map((user) => user.id),
    ["ana"]
  );
  assert.equal(groups.size, 2);
});
