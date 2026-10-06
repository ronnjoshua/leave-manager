# Task 2 report

## Files changed

- `src/lib/admin-departments.ts`: added pure name, sibling uniqueness, parent, and replacement-membership validation helpers.
- `src/app/api/admin/departments/route.ts`: added admin-only department listing and creation with member counts and user assignment data.
- `src/app/api/admin/departments/[id]/route.ts`: added admin-only rename/reparent/delete behavior, including cycle prevention and atomic member clearing/child promotion on delete.
- `src/app/api/admin/departments/[id]/members/route.ts`: added admin-only replacement membership that moves users from prior departments atomically.
- `src/app/api/admin/users/route.ts`: restricted allowed-user listing and creation to the fixed superadmin and stabilized malformed-body errors.
- `src/app/api/admin/users/[id]/route.ts`: restricted deletion to the fixed superadmin, added role updates, protected the superadmin identity, and returned 404 for missing users.
- `tests/admin-departments-api.test.ts`: added pure validation coverage for required names, sibling duplicates, invalid parents, cycles, and single-department replacement membership.

## TDD and verification

- RED: `node --import tsx --test tests/admin-departments-api.test.ts` failed because `src/lib/admin-departments.ts` did not exist.
- GREEN: `node --import tsx --test tests/admin-departments-api.test.ts` passed 5/5.
- Full suite: `node --import tsx --test tests/*.test.ts` passed 13/13.
- TypeScript: `npx tsc --noEmit` passed.
- Targeted ESLint passed for all Task 2 source and test files.

## Concerns

- The project uses Drizzle's Neon HTTP driver, whose callback-style `db.transaction()` deliberately throws because interactive transactions are unsupported. Department mutations therefore use `db.batch(...)`; in this driver Drizzle submits the statements through Neon's `client.transaction(...)`, preserving atomic transaction semantics for delete and membership replacement.
- Signed-role browser/API verification remains manual. The existing browser sessions point at the deployed app, while unsigned localhost requests are redirected to `/login` by middleware before the route-level 403 guards run. No accounts or sessions were modified to manufacture test roles.

## Review fixes — round 1

- Department deletion now detects direct-child promotion collisions before mutation and maps concurrent database uniqueness conflicts to a stable 409. The transaction rolls back member clearing and child promotion on conflict.
- The sibling-name unique index now stores `lower(name)` alongside the normalized parent key, so concurrent case variants are rejected by PostgreSQL rather than only by the in-memory precheck.
- POST, PATCH, and DELETE hierarchy mutations now share a transaction-scoped PostgreSQL advisory lock. Reparenting additionally re-evaluates parent existence and descendants in a recursive SQL predicate after the lock is acquired, preventing two concurrent reparent operations from creating a cycle.
- Allowed-user and role authorization now uses a testable `canManageAllowedUsers` guard shared by every route. Tests prove a regular-admin email is denied and the fixed superadmin email is allowed.
- Added focused coverage for deletion promotion conflicts, the normalized persistence index, hierarchy serialization/current-state cycle validation SQL, and allowed-user authorization.

Review verification: the focused review tests passed 11/11, the full suite passed 19/19, `npx tsc --noEmit` passed, and targeted ESLint passed.

## Review fixes — round 2

- Extracted the department DELETE decision/response boundary into `deleteDepartmentMutation`, which the route calls with its real Drizzle transaction. A controlled in-memory test now verifies a promotion collision returns 409, never enters the transaction, and preserves both assignments and child parents.
- Extracted the shared allowed-user route authorization wrapper and handler factories used by the real GET/POST/DELETE/PATCH exports. Route-level tests inject controlled operations and prove all four methods return 403 without executing for a regular admin, while all four execute for the fixed superadmin.
- These seams avoid fabricated Auth.js cookies or mutable test-only production state while exercising the same authorization and mutation control flow used by the route modules.

Review round 2 verification: focused route/application tests passed 3/3, the full suite passed 22/22, `npx tsc --noEmit` passed, and targeted ESLint passed.

## Review fixes — round 3

- Added minimal optional dependency parameters directly to the exported allowed-user GET/POST/DELETE/PATCH handlers and department DELETE handler. Next.js production invocations use the unchanged request/context arguments and default production dependencies.
- Tests now import and invoke the actual route exports with controlled dependencies, asserting real `NextResponse` instances, status codes, JSON bodies, operation call counts, and unchanged department/member state on a 409 promotion conflict.

Review round 3 verification: focused exported-route tests passed 3/3, the full suite passed 22/22, `npx tsc --noEmit` passed (including generated Next.js route validators), and targeted ESLint passed.

## Review fixes — final

- Department deletion now releases the target department's sibling-name key inside the advisory-locked batch before promoting its children. A child may therefore inherit the target's parent when it has the same normalized name as the target, while genuine destination-sibling conflicts still fail with PostgreSQL `23505`, roll back the full batch, and return the stable 409 response.
- Department membership replacement now acquires the same transaction-scoped advisory lock before clearing or assigning members. Concurrent replacements are serialized instead of interleaving into a merged selection.
- Added regression coverage through the actual exported DELETE route for the same-name parent/child case, plus explicit transaction-order tests for deletion and both empty and non-empty membership replacements.

Final review verification: focused mutation/exported-route tests passed 6/6, the full suite passed 49/49, `npx tsc --noEmit` passed, and targeted ESLint passed.

## Whole-branch membership race fix

- Member replacement now rechecks the target department immediately after acquiring the shared hierarchy advisory lock. Both empty and non-empty replacements return a stable JSON 404 when a concurrent delete commits first; an empty replacement can no longer report false success for a deleted target.
- Non-empty assignment is additionally guarded by current target existence, and PostgreSQL foreign-key violation `23503` is mapped to the same stable 404 if an out-of-band delete races the advisory-lock protocol.
- Added a minimal dependency seam to the actual exported PUT handler and controlled route regressions for the delete/empty-PUT interleaving and foreign-key race. The transaction-order test now requires lock, target recheck, clear, then optional assignment.

Whole-branch fix verification: focused mutation/exported-route tests passed 6/6, the full suite passed 54/54, `npx tsc --noEmit` passed, targeted ESLint passed, and `git diff --check` passed.

## Final membership post-write fix

- Membership replacement batches now finish with a second target-department query after the clear and optional assignment. The API derives success only from this post-write result, so a non-empty replacement whose `EXISTS`-guarded assignment updates zero rows because the target vanished returns 404 rather than a false 200.
- The existing transaction-scoped advisory lock, atomic batch behavior, and `23503` foreign-key mapping remain intact.
- Added controlled exported-PUT coverage for a target present at the initial check but missing before the guarded assignment, and strengthened transaction-order coverage to require the final verification statement.

Final membership verification: focused mutation/exported-route tests passed 7/7, the full suite passed 55/55, `npx tsc --noEmit` passed, targeted ESLint passed, and `git diff --check` passed.
