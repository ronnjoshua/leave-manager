import test from "node:test";
import assert from "node:assert/strict";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  departmentDeletionMutationBatch,
  departmentHierarchyLockQuery,
  departmentMembershipMutationBatch,
  departmentParentConstraint,
} from "../src/lib/department-mutations";

const dialect = new PgDialect();

test("serializes department hierarchy mutations with a transaction lock", () => {
  const query = dialect.sqlToQuery(departmentHierarchyLockQuery());
  assert.match(query.sql, /pg_advisory_xact_lock/);
});

test("rechecks descendant cycles in the database after acquiring the lock", () => {
  const query = dialect.sqlToQuery(
    departmentParentConstraint("engineering", "platform")
  );
  assert.match(query.sql.toLowerCase(), /with recursive/);
  assert.match(query.sql.toLowerCase(), /not exists/);
  assert.deepEqual(query.params, ["platform", "engineering", "platform"]);
});

test("releases a deleted department name before promoting its children", () => {
  assert.deepEqual(
    departmentDeletionMutationBatch(
      "lock",
      "release-name",
      "clear-members",
      "promote-children",
      "delete-target"
    ),
    [
      "lock",
      "release-name",
      "clear-members",
      "promote-children",
      "delete-target",
    ]
  );
});

test("locks member replacement before clearing and assigning users", () => {
  assert.deepEqual(
    departmentMembershipMutationBatch("lock", "clear", "assign"),
    ["lock", "clear", "assign"]
  );
  assert.deepEqual(
    departmentMembershipMutationBatch("lock", "clear"),
    ["lock", "clear"]
  );
});
