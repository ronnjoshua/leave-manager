import {
  canSetDepartmentParent,
  type DepartmentNode,
} from "@/lib/departments";

export type DepartmentNameResult =
  | { ok: true; name: string }
  | { ok: false; error: "Department name is required" };

export function normalizeDepartmentName(value: unknown): DepartmentNameResult {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: "Department name is required" };
  }

  return { ok: true, name: value.trim() };
}

export function hasSiblingDepartmentName(
  departments: DepartmentNode[],
  name: string,
  parentId: string | null,
  excludeId?: string
): boolean {
  const normalizedName = name.trim().toLowerCase();
  return departments.some(
    (department) =>
      department.id !== excludeId &&
      department.parentId === parentId &&
      department.name.trim().toLowerCase() === normalizedName
  );
}

export function isValidDepartmentParent(
  departments: DepartmentNode[],
  departmentId: string | null,
  parentId: string | null
): boolean {
  if (parentId === null) return true;
  if (departmentId === null) {
    return departments.some((department) => department.id === parentId);
  }
  return canSetDepartmentParent(departments, departmentId, parentId);
}

export function hasDepartmentPromotionConflict(
  departments: DepartmentNode[],
  departmentId: string
): boolean {
  const target = departments.find(
    (department) => department.id === departmentId
  );
  if (!target) return false;

  const occupiedNames = new Set(
    departments
      .filter(
        (department) =>
          department.id !== departmentId &&
          department.parentId === target.parentId
      )
      .map((department) => department.name.trim().toLowerCase())
  );

  for (const child of departments.filter(
    (department) => department.parentId === departmentId
  )) {
    const childName = child.name.trim().toLowerCase();
    if (occupiedNames.has(childName)) return true;
    occupiedNames.add(childName);
  }
  return false;
}

export function replaceDepartmentMembers<
  T extends { id: string; departmentId: string | null },
>(users: T[], departmentId: string, userIds: string[]): T[] {
  const selectedIds = new Set(userIds);
  return users.map((user) => {
    if (selectedIds.has(user.id)) return { ...user, departmentId };
    if (user.departmentId === departmentId) {
      return { ...user, departmentId: null };
    }
    return user;
  });
}
