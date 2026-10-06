export type DepartmentNode = {
  id: string;
  name: string;
  parentId: string | null;
};

const SUPERADMIN_EMAIL = "nucup53@gmail.com";

export function isSuperAdmin(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === SUPERADMIN_EMAIL;
}

/** Return a root department followed by every reachable descendant once. */
export function getDescendantDepartmentIds(
  departments: DepartmentNode[],
  rootId: string
): string[] {
  const byParent = new Map<string | null, DepartmentNode[]>();
  for (const department of departments) {
    const children = byParent.get(department.parentId) ?? [];
    children.push(department);
    byParent.set(department.parentId, children);
  }

  const byId = new Set(departments.map((department) => department.id));
  if (!byId.has(rootId)) return [];

  const result: string[] = [];
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    result.push(id);
    for (const child of byParent.get(id) ?? []) visit(child.id);
  };
  visit(rootId);
  return result;
}

/** Whether assigning parentId would preserve a valid, acyclic hierarchy. */
export function canSetDepartmentParent(
  departments: DepartmentNode[],
  departmentId: string,
  parentId: string | null
): boolean {
  const byId = new Map(departments.map((department) => [department.id, department]));
  if (!byId.has(departmentId)) return false;
  if (parentId === null) return true;
  if (!byId.has(parentId) || parentId === departmentId) return false;

  const seen = new Set<string>();
  let current: string | null = parentId;
  while (current !== null) {
    if (current === departmentId || seen.has(current)) return false;
    seen.add(current);
    current = byId.get(current)?.parentId ?? null;
  }
  return true;
}
