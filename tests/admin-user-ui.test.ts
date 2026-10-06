import test from "node:test";
import assert from "node:assert/strict";
import { getAllowedUserControls } from "../src/lib/admin-user-ui";

test("protects the fixed superadmin from role changes and removal", () => {
  assert.deepEqual(
    getAllowedUserControls({
      email: "nucup53@gmail.com",
      isAdmin: true,
    }),
    {
      isProtected: true,
      roleAction: null,
      canRemove: false,
    }
  );
});

test("allows the superadmin UI to revoke and remove a regular admin", () => {
  assert.deepEqual(
    getAllowedUserControls({
      email: "regular-admin@example.com",
      isAdmin: true,
    }),
    {
      isProtected: false,
      roleAction: "revoke",
      canRemove: true,
    }
  );
});

test("allows the superadmin UI to grant admin access or remove a user", () => {
  assert.deepEqual(
    getAllowedUserControls({
      email: "employee@example.com",
      isAdmin: false,
    }),
    {
      isProtected: false,
      roleAction: "grant",
      canRemove: true,
    }
  );
});
