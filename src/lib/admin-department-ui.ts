import type { DepartmentNode } from "@/lib/departments";

export type DepartmentUser = {
  id: string;
  email: string;
  isAdmin: boolean;
  departmentId: string | null;
};

export type DepartmentDisplayRow<T extends DepartmentNode = DepartmentNode> = {
  department: T;
  depth: number;
};

function compareByName(
  left: Pick<DepartmentNode, "name">,
  right: Pick<DepartmentNode, "name">
): number {
  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

/** Flatten the hierarchy for display while retaining each row's nesting depth. */
export function sortDepartmentsForDisplay<T extends DepartmentNode>(
  departments: T[]
): DepartmentDisplayRow<T>[] {
  const knownIds = new Set(departments.map((department) => department.id));
  const byParent = new Map<string | null, T[]>();

  for (const department of departments) {
    const parentId =
      department.parentId && knownIds.has(department.parentId)
        ? department.parentId
        : null;
    const siblings = byParent.get(parentId) ?? [];
    siblings.push(department);
    byParent.set(parentId, siblings);
  }
  for (const siblings of byParent.values()) siblings.sort(compareByName);

  const rows: DepartmentDisplayRow<T>[] = [];
  const visited = new Set<string>();
  const visit = (department: T, depth: number) => {
    if (visited.has(department.id)) return;
    visited.add(department.id);
    rows.push({ department, depth });
    for (const child of byParent.get(department.id) ?? []) {
      visit(child, depth + 1);
    }
  };

  for (const root of byParent.get(null) ?? []) visit(root, 0);
  for (const department of [...departments].sort(compareByName)) {
    visit(department, 0);
  }

  return rows;
}

/** Group users by their single persisted assignment and sort each group by email. */
export function groupUsersByDepartment(
  users: DepartmentUser[]
): Map<string | null, DepartmentUser[]> {
  const groups = new Map<string | null, DepartmentUser[]>();
  for (const user of users) {
    const group = groups.get(user.departmentId) ?? [];
    group.push(user);
    groups.set(user.departmentId, group);
  }

  for (const group of groups.values()) {
    group.sort((left, right) =>
      left.email.localeCompare(right.email, undefined, { sensitivity: "base" })
    );
  }
  return groups;
}
