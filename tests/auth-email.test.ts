import test from "node:test";
import assert from "node:assert/strict";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  allowedUserEmailCondition,
  canonicalizeEmailIdentity,
} from "../src/lib/email-identity";

const dialect = new PgDialect();

test("canonicalizes mixed-case OAuth identities before allowlist lookup", () => {
  assert.equal(
    canonicalizeEmailIdentity("  Nucup53@Gmail.com "),
    "nucup53@gmail.com"
  );
});

test("uses the canonical OAuth identity for the indexed allowlist lookup", () => {
  const query = dialect.sqlToQuery(
    allowedUserEmailCondition("  Nucup53@Gmail.com ")
  );

  assert.match(query.sql, /"allowed_user"\."email" = \$1/);
  assert.deepEqual(query.params, ["nucup53@gmail.com"]);
});
