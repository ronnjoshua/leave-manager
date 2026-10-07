# Database migration notes

`0000_departments.sql` is an additive upgrade for an existing leave-calculator database. It assumes the pre-department auth and leave schema already exists, including `allowed_user`; it is not a bootstrap migration for an empty database.

`0001_salty_wendigo.sql` adds the nullable `display_name` and `custom_image_url` columns to the existing `user` table for custom profile names and avatars.

The SQL is safe to rerun where practical: the table, column, constraints, and indexes are guarded against duplicate creation. Existing allowed users remain unassigned because `department_id` is nullable and has no default or backfill.

`meta/0000_snapshot.json` is the complete current Drizzle schema snapshot, including the pre-existing tables. Future `drizzle-kit generate` runs compare against that full snapshot even though the SQL file contains only the department upgrade.

## Existing populated databases

Use this order exactly:

1. Point `DATABASE_URL` at the intended environment and take the environment's normal recoverable backup/snapshot.
2. Apply the current schema with the schema-aware project command. Do **not** invoke a replay-based migration runner yet.

```sh
npm run db:push -- --verbose
```

3. Confirm that the push output contains only the expected additive department statements, or reports no changes when they were already applied. It must not drop, truncate, or recreate an existing auth/leave table.
4. Verify the resulting catalog. The following query must return `true` for every column:

```sql
SELECT
  to_regclass('public.department') IS NOT NULL AS department_table,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'allowed_user'
      AND column_name = 'department_id'
      AND is_nullable = 'YES'
      AND column_default IS NULL
  ) AS nullable_department_id,
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'department_parent_id_department_id_fk'
      AND confdeltype = 'n'
  ) AS department_parent_set_null,
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'allowed_user_department_id_department_id_fk'
      AND confdeltype = 'n'
  ) AS allowed_user_department_set_null,
  to_regclass('public.department_parent_name_unique') IS NOT NULL
    AS sibling_name_index,
  to_regclass('public.department_parent_id_idx') IS NOT NULL
    AS department_parent_index,
  to_regclass('public.allowed_user_department_id_idx') IS NOT NULL
    AS allowed_user_department_index;
```

5. If the environment will continue using `db:push`, stop here. Do not create a migration journal merely for `db:push`.
6. If adopting the default Drizzle replay-based migrator, baseline `0000_departments` as already applied **without executing `0000_departments.sql` again**. For this exact committed migration, run the following transaction only after steps 1–4 succeed:

```sql
BEGIN;

CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id serial PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM drizzle.__drizzle_migrations
    WHERE created_at = 1791269725518
      AND hash <> '205b283b6a9c57c1293ea7297197eb8af322e3277aca968b0a760ac396bfbf11'
  ) THEN
    RAISE EXCEPTION 'Drizzle baseline timestamp already has a different hash';
  END IF;
END $$;

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT
  '205b283b6a9c57c1293ea7297197eb8af322e3277aca968b0a760ac396bfbf11',
  1791269725518
WHERE NOT EXISTS (
  SELECT 1
  FROM drizzle.__drizzle_migrations
  WHERE created_at = 1791269725518
);

COMMIT;
```

7. Verify the journal row before enabling the migration runner:

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
WHERE created_at = 1791269725518;
```

It must return exactly the hash and timestamp shown above. If a future commit changes `0000_departments.sql` or `meta/_journal.json`, recompute the SHA-256 and use that commit's journal timestamp instead of these values. Custom migration schema/table settings require an equivalent baseline in that configured location.

**Migration-runner adoption is unsupported until this baseline row is recorded and verified. Never point a replay-based runner with an empty journal at a populated database containing these schema changes.**

## Fresh environments

This repository does not currently provide a base bootstrap migration. Provision the pre-department auth and leave tables—including `allowed_user`, `user`, `account`, `session`, `verificationToken`, `leave_settings`, and `leave_record`—before applying `0000_departments.sql`. Only then may the additive department migration run and record itself normally. `0000_departments.sql` alone cannot initialize an empty database.
