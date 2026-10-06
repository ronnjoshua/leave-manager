import { sql, type SQL } from "drizzle-orm";
import { departments } from "@/lib/db/schema";
import {
  hasDepartmentPromotionConflict,
  replaceDepartmentMembers,
} from "@/lib/admin-departments";
import type { DepartmentNode } from "@/lib/departments";

const DEPARTMENT_HIERARCHY_LOCK_KEY = 1_845_027_331;

export function departmentHierarchyLockQuery(): SQL {
  return sql`select pg_advisory_xact_lock(${DEPARTMENT_HIERARCHY_LOCK_KEY})`;
}

export function departmentDeletionMutationBatch<
  TLock,
  TReleaseName,
  TClearMembers,
  TPromoteChildren,
  TDeleteTarget,
>(
  lock: TLock,
  releaseName: TReleaseName,
  clearMembers: TClearMembers,
  promoteChildren: TPromoteChildren,
  deleteTarget: TDeleteTarget
): [TLock, TReleaseName, TClearMembers, TPromoteChildren, TDeleteTarget] {
  return [lock, releaseName, clearMembers, promoteChildren, deleteTarget];
}

export function departmentMembershipMutationBatch<
  TLock,
  TCheckDepartment,
  TClearMembers,
  TVerifyDepartment,
>(
  lock: TLock,
  checkDepartment: TCheckDepartment,
  clearMembers: TClearMembers,
  verifyDepartment: TVerifyDepartment
): [TLock, TCheckDepartment, TClearMembers, TVerifyDepartment];
export function departmentMembershipMutationBatch<
  TLock,
  TCheckDepartment,
  TClearMembers,
  TAssignMembers,
  TVerifyDepartment,
>(
  lock: TLock,
  checkDepartment: TCheckDepartment,
  clearMembers: TClearMembers,
  assignMembers: TAssignMembers,
  verifyDepartment: TVerifyDepartment
): [
  TLock,
  TCheckDepartment,
  TClearMembers,
  TAssignMembers,
  TVerifyDepartment,
];
export function departmentMembershipMutationBatch<
  TLock,
  TCheckDepartment,
  TClearMembers,
  TAssignOrVerify,
  TVerifyDepartment,
>(
  lock: TLock,
  checkDepartment: TCheckDepartment,
  clearMembers: TClearMembers,
  assignOrVerify: TAssignOrVerify,
  verifyDepartment?: TVerifyDepartment
):
  | [TLock, TCheckDepartment, TClearMembers, TAssignOrVerify]
  | [
      TLock,
      TCheckDepartment,
      TClearMembers,
      TAssignOrVerify,
      TVerifyDepartment,
    ] {
  return verifyDepartment === undefined
    ? [lock, checkDepartment, clearMembers, assignOrVerify]
    : [
        lock,
        checkDepartment,
        clearMembers,
        assignOrVerify,
        verifyDepartment,
      ];
}

export function departmentParentConstraint(
  departmentId: string,
  parentId: string | null
): SQL {
  if (parentId === null) return sql`true`;

  return sql`
    exists (
      select 1
      from ${departments} parent_candidate
      where parent_candidate.id = ${parentId}
    )
    and not exists (
      with recursive descendants(id) as (
        select hierarchy_root.id
        from ${departments} hierarchy_root
        where hierarchy_root.id = ${departmentId}
        union
        select child.id
        from ${departments} child
        join descendants on child.parent_id = descendants.id
      )
      select 1
      from descendants
      where descendants.id = ${parentId}
    )
  `;
}

type DeleteDepartmentDependencies = {
  listDepartments: () => Promise<DepartmentNode[]>;
  deleteAtomically: () => Promise<boolean>;
};

type DeleteDepartmentResult = {
  status: 200 | 404 | 409;
  body: { ok: true } | { error: string };
};

const PROMOTION_CONFLICT_ERROR =
  "Cannot delete department because promoting its children would create duplicate sibling names";

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  if ("cause" in error) return databaseErrorCode(error.cause);
  return undefined;
}

type DepartmentMember = {
  id: string;
  departmentId: string | null;
};

type ReplaceDepartmentMembersDependencies = {
  listUsers: () => Promise<DepartmentMember[]>;
  replaceAtomically: (assignedUserIds: string[]) => Promise<boolean>;
};

type ReplaceDepartmentMembersResult = {
  status: 200 | 404;
  body:
    | { ok: true; userIds: string[] }
    | { error: "Department not found" | "One or more users were not found" };
};

export async function replaceDepartmentMembersMutation(
  departmentId: string,
  userIds: string[],
  dependencies: ReplaceDepartmentMembersDependencies
): Promise<ReplaceDepartmentMembersResult> {
  const userRows = await dependencies.listUsers();
  const knownUserIds = new Set(userRows.map((user) => user.id));
  if (userIds.some((userId) => !knownUserIds.has(userId))) {
    return {
      status: 404,
      body: { error: "One or more users were not found" },
    };
  }

  const assignments = replaceDepartmentMembers(userRows, departmentId, userIds);
  const assignedUserIds = assignments
    .filter((user) => user.departmentId === departmentId)
    .map((user) => user.id);

  try {
    const departmentExists = await dependencies.replaceAtomically(
      assignedUserIds
    );
    return departmentExists
      ? { status: 200, body: { ok: true, userIds: assignedUserIds } }
      : { status: 404, body: { error: "Department not found" } };
  } catch (error) {
    if (databaseErrorCode(error) === "23503") {
      return { status: 404, body: { error: "Department not found" } };
    }
    throw error;
  }
}

export async function deleteDepartmentMutation(
  departmentId: string,
  dependencies: DeleteDepartmentDependencies
): Promise<DeleteDepartmentResult> {
  const departmentRows = await dependencies.listDepartments();
  if (!departmentRows.some((department) => department.id === departmentId)) {
    return { status: 404, body: { error: "Department not found" } };
  }
  if (hasDepartmentPromotionConflict(departmentRows, departmentId)) {
    return { status: 409, body: { error: PROMOTION_CONFLICT_ERROR } };
  }

  try {
    const deleted = await dependencies.deleteAtomically();
    return deleted
      ? { status: 200, body: { ok: true } }
      : { status: 404, body: { error: "Department not found" } };
  } catch (error) {
    if (databaseErrorCode(error) === "23505") {
      return { status: 409, body: { error: PROMOTION_CONFLICT_ERROR } };
    }
    throw error;
  }
}
