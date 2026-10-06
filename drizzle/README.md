# Database migration notes

`0000_departments.sql` is an additive upgrade for an existing leave-calculator database. It assumes the pre-department auth and leave schema already exists, including `allowed_user`; it is not a bootstrap migration for an empty database.

The SQL is safe to rerun where practical: the table, column, constraints, and indexes are guarded against duplicate creation. Existing allowed users remain unassigned because `department_id` is nullable and has no default or backfill.

`meta/0000_snapshot.json` is the complete current Drizzle schema snapshot, including the pre-existing tables. Future `drizzle-kit generate` runs compare against that full snapshot even though the SQL file contains only the department upgrade.

For an already provisioned environment, apply the schema-aware project command:

```sh
npm run db:push -- --verbose
```

If adopting a replay-based migration runner for an existing environment, baseline its migration journal before running historical files. For a brand-new database, provision the base auth and leave tables before applying this upgrade.
