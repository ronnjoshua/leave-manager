import test from "node:test";
import assert from "node:assert/strict";
import {
  canSetDepartmentParent,
  getDescendantDepartmentIds,
  type DepartmentNode,
} from "../src/lib/departments";

import { isSuperAdmin } from "../src/lib/departments";

const departments: DepartmentNode[] = [
  { id: "engineering", name: "Engineering", parentId: null },
  { id: "platform", name: "Platform", parentId: "engineering" },
  { id: "developer-experience", name: "Developer Experience", parentId: "platform" },
  { id: "security", name: "Security", parentId: "engineering" },
];

test("resolves nested descendants from a root", () => {
  assert.deepEqual(getDescendantDepartmentIds(departments, "engineering"), [
    "engineering",
    "platform",
    "developer-experience",
    "security",
  ]);
});

test("does not duplicate a department when malformed parent data converges", () => {
  const converging = [
    ...departments,
    { id: "duplicate-parent-reference", name: "Duplicate", parentId: "platform" },
  ];
  assert.equal(
    new Set(getDescendantDepartmentIds(converging, "engineering")).size,
    getDescendantDepartmentIds(converging, "engineering").length
  );
});

test("rejects a department as its own parent and rejects descendants as parents", () => {
  assert.equal(canSetDepartmentParent(departments, "engineering", "engineering"), false);
  assert.equal(canSetDepartmentParent(departments, "engineering", "developer-experience"), false);
});

test("rejects a missing parent but accepts a new root", () => {
  assert.equal(canSetDepartmentParent(departments, "platform", "missing"), false);
  assert.equal(canSetDepartmentParent(departments, "platform", null), true);
});

test("recognizes only the fixed superadmin identity", () => {
  assert.equal(isSuperAdmin("nucup53@gmail.com"), true);
  assert.equal(isSuperAdmin("other@example.com"), false);
  assert.equal(isSuperAdmin(null), false);
  assert.equal(isSuperAdmin(undefined), false);
});
