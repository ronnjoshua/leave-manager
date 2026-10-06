# Task 1 report

## Files changed

- `src/lib/db/schema.ts`: added the self-referencing `department` table, timestamps, a sibling-name unique index (including root departments), and nullable `allowed_user.department_id`.
- `src/lib/departments.ts`: added `DepartmentNode`, cycle-safe descendant traversal, parent validation, and the fixed superadmin identity helper.
- `src/lib/auth.ts`: re-exported `isSuperAdmin` and made the fixed superadmin an admin for existing admin checks.
- `tests/departments.test.ts`: added hierarchy, duplicate-free traversal, parent validation, and superadmin tests.

## Tests run

- `node --import tsx --test tests/departments.test.ts` — 5 passed.
- `node --import tsx --test tests/*.test.ts` — 8 passed.
- `npx tsc --noEmit` — passed.

## Concerns

- The schema uses a SQL `coalesce(parent_id, '')` expression in the unique index so duplicate root names are prevented as well as duplicate sibling names. API-level name trimming and mutation validation remain for Task 2.
- Existing unrelated calendar/admin working-tree changes were preserved.
