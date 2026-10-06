import test from "node:test";
import assert from "node:assert/strict";
import {
  getAvailableAdminTabs,
  getNextAdminTab,
  type AdminTab,
} from "../src/lib/admin-tabs";

const tabs: AdminTab[] = ["leaves", "departments", "users"];

test("moves through tabs with wrapping arrow-key navigation", () => {
  assert.equal(getNextAdminTab(tabs, "leaves", "ArrowRight"), "departments");
  assert.equal(getNextAdminTab(tabs, "users", "ArrowRight"), "leaves");
  assert.equal(getNextAdminTab(tabs, "leaves", "ArrowLeft"), "users");
});

test("moves to the first and last available tab with Home and End", () => {
  assert.equal(getNextAdminTab(tabs, "departments", "Home"), "leaves");
  assert.equal(getNextAdminTab(tabs, "departments", "End"), "users");
});

test("keeps the current tab for unrelated keys and respects role-filtered tabs", () => {
  const regularAdminTabs = getAvailableAdminTabs(false);

  assert.equal(
    getNextAdminTab(regularAdminTabs, "departments", "ArrowRight"),
    "leaves"
  );
  assert.equal(
    getNextAdminTab(regularAdminTabs, "departments", "Enter"),
    "departments"
  );
});

test("shows Allowed Users only to the fixed superadmin role", () => {
  assert.deepEqual(getAvailableAdminTabs(false), ["leaves", "departments"]);
  assert.deepEqual(getAvailableAdminTabs(true), [
    "leaves",
    "departments",
    "users",
  ]);
});
