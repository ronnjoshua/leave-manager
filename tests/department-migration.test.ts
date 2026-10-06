import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../drizzle/0000_departments.sql", import.meta.url),
  "utf8"
);

test("department migration is additive to the existing auth and leave schema", () => {
  assert.doesNotMatch(migration, /CREATE TABLE "account"/);
  assert.doesNotMatch(migration, /CREATE TABLE "allowed_user"/);
  assert.doesNotMatch(migration, /CREATE TABLE "leave_record"/);
  assert.doesNotMatch(migration, /CREATE TABLE "leave_settings"/);
  assert.doesNotMatch(migration, /CREATE TABLE "session"/);
  assert.doesNotMatch(migration, /CREATE TABLE "user"/);
  assert.doesNotMatch(migration, /CREATE TABLE "verificationToken"/);
});

test("department migration is safely rerunnable and indexes foreign keys", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "department"/);
  assert.match(
    migration,
    /ALTER TABLE "allowed_user" ADD COLUMN IF NOT EXISTS "department_id" text/
  );
  assert.match(migration, /department_parent_id_department_id_fk/);
  assert.match(migration, /allowed_user_department_id_department_id_fk/);
  assert.match(migration, /ON DELETE SET NULL/g);
  assert.match(
    migration,
    /CREATE UNIQUE INDEX IF NOT EXISTS "department_parent_name_unique"/
  );
  assert.match(
    migration,
    /CREATE INDEX IF NOT EXISTS "department_parent_id_idx"/
  );
  assert.match(
    migration,
    /CREATE INDEX IF NOT EXISTS "allowed_user_department_id_idx"/
  );
});
