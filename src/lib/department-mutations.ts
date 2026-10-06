import { sql, type SQL } from "drizzle-orm";
import { departments } from "@/lib/db/schema";

const DEPARTMENT_HIERARCHY_LOCK_KEY = 1_845_027_331;

export function departmentHierarchyLockQuery(): SQL {
  return sql`select pg_advisory_xact_lock(${DEPARTMENT_HIERARCHY_LOCK_KEY})`;
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
