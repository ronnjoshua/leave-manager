import test from "node:test";
import assert from "node:assert/strict";
import {
  hasDepartmentPromotionConflict,
  hasSiblingDepartmentName,
  isValidDepartmentParent,
  normalizeDepartmentName,
  replaceDepartmentMembers,
} from "../src/lib/admin-departments";
import type { DepartmentNode } from "../src/lib/departments";
import {
  allowedUsers,
  departments as departmentsTable,
} from "../src/lib/db/schema";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { SQL } from "drizzle-orm";

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

test("rejects deleting a department when child promotion would duplicate a sibling", () => {
  const promotionDepartments: DepartmentNode[] = [
    { id: "existing-sales", name: "Sales", parentId: null },
    { id: "division", name: "Division", parentId: null },
    { id: "promoted-sales", name: " sales ", parentId: "division" },
  ];

  assert.equal(
    hasDepartmentPromotionConflict(promotionDepartments, "division"),
    true
  );
  assert.equal(
    hasDepartmentPromotionConflict(promotionDepartments, "promoted-sales"),
    false
  );
});

test("persists case-insensitive sibling uniqueness in the database index", () => {
  const index = getTableConfig(departmentsTable).indexes.find(
    (candidate) => candidate.config.name === "department_parent_name_unique"
  );
  assert.ok(index);
  const nameExpression = index.config.columns[1];
  assert.ok(nameExpression instanceof SQL);
  assert.equal(
    new PgDialect().sqlToQuery(nameExpression).sql,
    'lower("department"."name")'
  );
});

test("indexes both sides of department hierarchy and membership lookups", () => {
  const departmentIndexes = getTableConfig(departmentsTable).indexes.map(
    (candidate) => candidate.config.name
  );
  const allowedUserIndexes = getTableConfig(allowedUsers).indexes.map(
    (candidate) => candidate.config.name
  );

  assert.ok(departmentIndexes.includes("department_parent_id_idx"));
  assert.ok(allowedUserIndexes.includes("allowed_user_department_id_idx"));
});
