import test from "node:test";
import assert from "node:assert/strict";
import { canManageAllowedUsers } from "../src/lib/admin-authorization";

test("denies allowed-user and role operations to a regular admin", () => {
  assert.equal(canManageAllowedUsers("regular-admin@example.com"), false);
});

test("allows allowed-user and role operations for the fixed superadmin", () => {
  assert.equal(canManageAllowedUsers("nucup53@gmail.com"), true);
});
