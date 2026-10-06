import test from "node:test";
import assert from "node:assert/strict";
import {
  hasSiblingDepartmentName,
  isValidDepartmentParent,
  normalizeDepartmentName,
  replaceDepartmentMembers,
} from "../src/lib/admin-departments";
import type { DepartmentNode } from "../src/lib/departments";

const departments: DepartmentNode[] = [
  { id: "engineering", name: "Engineering", parentId: null },
  { id: "platform", name: "Platform", parentId: "engineering" },
  { id: "security", name: "Security", parentId: "engineering" },
  { id: "developer-experience", name: "Developer Experience", parentId: "platform" },
];

test("requires a non-empty trimmed department name", () => {
  assert.deepEqual(normalizeDepartmentName("  Platform Operations  "), {
    ok: true,
    name: "Platform Operations",
  });
  assert.deepEqual(normalizeDepartmentName("   "), {
    ok: false,
    error: "Department name is required",
  });
  assert.deepEqual(normalizeDepartmentName(null), {
    ok: false,
    error: "Department name is required",
  });
});

test("rejects duplicate sibling names without blocking another branch", () => {
  assert.equal(
    hasSiblingDepartmentName(departments, " platform ", "engineering"),
    true
  );
  assert.equal(
    hasSiblingDepartmentName(departments, "PLATFORM", "security"),
    false
  );
  assert.equal(
    hasSiblingDepartmentName(
      departments,
      "Platform",
      "engineering",
      "platform"
    ),
    false
  );
});

test("rejects a parent that does not exist", () => {
  assert.equal(
    isValidDepartmentParent(departments, "platform", "missing"),
    false
  );
});

test("rejects reparenting a department beneath its descendant", () => {
  assert.equal(
    isValidDepartmentParent(
      departments,
      "engineering",
      "developer-experience"
    ),
    false
  );
  assert.equal(
    isValidDepartmentParent(departments, "security", "platform"),
    true
  );
});

test("replacement membership assigns every user to at most one department", () => {
  const users = [
    { id: "ana", departmentId: "engineering" },
    { id: "ben", departmentId: "platform" },
    { id: "cara", departmentId: "security" },
  ];

  assert.deepEqual(
    replaceDepartmentMembers(users, "platform", ["ana", "ana", "cara"]),
    [
      { id: "ana", departmentId: "platform" },
      { id: "ben", departmentId: null },
      { id: "cara", departmentId: "platform" },
    ]
  );
});
