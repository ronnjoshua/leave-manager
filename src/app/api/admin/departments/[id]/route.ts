import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedUsers, departments } from "@/lib/db/schema";
import {
  hasSiblingDepartmentName,
  isValidDepartmentParent,
  normalizeDepartmentName,
} from "@/lib/admin-departments";
import {
  departmentHierarchyLockQuery,
  departmentParentConstraint,
  deleteDepartmentMutation,
} from "@/lib/department-mutations";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  if ("cause" in error) return databaseErrorCode(error.cause);
  return undefined;
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const values = body as Record<string, unknown>;
  const hasName = Object.hasOwn(values, "name");
  const hasParentId = Object.hasOwn(values, "parentId");
  if (!hasName && !hasParentId) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const departmentRows = await db
    .select({
      id: departments.id,
      name: departments.name,
      parentId: departments.parentId,
    })
    .from(departments);
  const current = departmentRows.find((department) => department.id === id);
  if (!current) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  let name = current.name;
  if (hasName) {
    const nameResult = normalizeDepartmentName(values.name);
    if (!nameResult.ok) {
      return NextResponse.json({ error: nameResult.error }, { status: 400 });
    }
    name = nameResult.name;
  }

  let parentId = current.parentId;
  if (hasParentId) {
    if (
      values.parentId !== null &&
      (typeof values.parentId !== "string" || !values.parentId.trim())
    ) {
      return NextResponse.json(
        { error: "Invalid parent department" },
        { status: 400 }
      );
    }
    parentId =
      typeof values.parentId === "string" ? values.parentId.trim() : null;

    if (
      parentId !== null &&
      !departmentRows.some((department) => department.id === parentId)
    ) {
      return NextResponse.json(
        { error: "Parent department not found" },
        { status: 404 }
      );
    }
    if (!isValidDepartmentParent(departmentRows, id, parentId)) {
      return NextResponse.json(
        { error: "Department parent would create a cycle" },
        { status: 409 }
      );
    }
  }

  if (hasSiblingDepartmentName(departmentRows, name, parentId, id)) {
    return NextResponse.json(
      { error: "A department with this name already exists under that parent" },
      { status: 409 }
    );
  }

  try {
    const updateValues: Partial<typeof departments.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (hasName) updateValues.name = name;
    if (hasParentId) updateValues.parentId = parentId;

    const [, updatedRows] = await db.batch([
      db.execute(departmentHierarchyLockQuery()),
      db
        .update(departments)
        .set(updateValues)
        .where(
          and(
            eq(departments.id, id),
            hasParentId
              ? departmentParentConstraint(id, parentId)
              : undefined
          )
        )
        .returning(),
    ]);
    if (!updatedRows[0]) {
      return NextResponse.json(
        {
          error: hasParentId
            ? "Department parent would create a cycle or the hierarchy changed"
            : "Department not found",
        },
        { status: hasParentId ? 409 : 404 }
      );
    }
    return NextResponse.json(updatedRows[0]);
  } catch (error) {
    const code = databaseErrorCode(error);
    if (code === "23505") {
      return NextResponse.json(
        { error: "A department with this name already exists under that parent" },
        { status: 409 }
      );
    }
    if (code === "23503") {
      return NextResponse.json(
        { error: "Parent department not found" },
        { status: 404 }
      );
    }
    throw error;
  }
}

type DeleteDepartmentRouteDependencies = {
  authorize: () => Promise<boolean>;
  deleteDepartment: (
    id: string
  ) => Promise<Awaited<ReturnType<typeof deleteDepartmentMutation>>>;
};

async function deleteDepartment(id: string) {
  return deleteDepartmentMutation(id, {
    listDepartments: () =>
      db
        .select({
          id: departments.id,
          name: departments.name,
          parentId: departments.parentId,
        })
        .from(departments),
    deleteAtomically: async () => {
      const [, , , deletedRows] = await db.batch([
        db.execute(departmentHierarchyLockQuery()),
        db
          .update(allowedUsers)
          .set({ departmentId: null })
          .where(eq(allowedUsers.departmentId, id)),
        db
          .update(departments)
          .set({
            parentId: sql`(
              select current_target.parent_id
              from ${departments} current_target
              where current_target.id = ${id}
            )`,
            updatedAt: new Date(),
          })
          .where(eq(departments.parentId, id)),
        db
          .delete(departments)
          .where(eq(departments.id, id))
          .returning({ id: departments.id }),
      ]);
      return Boolean(deletedRows[0]);
    },
  });
}

const productionDeleteDependencies: DeleteDepartmentRouteDependencies = {
  authorize: async () => {
    const session = await auth();
    return Boolean(
      session?.user?.email && (await isAdmin(session.user.email))
    );
  },
  deleteDepartment,
};

export async function DELETE(
  _request: NextRequest,
  { params }: Context,
  dependencies: DeleteDepartmentRouteDependencies = productionDeleteDependencies
) {
  if (!(await dependencies.authorize())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await dependencies.deleteDepartment(id);

  return NextResponse.json(result.body, { status: result.status });
}
