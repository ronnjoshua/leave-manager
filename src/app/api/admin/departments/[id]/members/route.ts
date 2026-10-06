import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedUsers, departments } from "@/lib/db/schema";
import {
  departmentHierarchyLockQuery,
  departmentMembershipMutationBatch,
  replaceDepartmentMembersMutation,
} from "@/lib/department-mutations";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

type PutDepartmentMembersRouteDependencies = {
  authorize: () => Promise<boolean>;
  replaceMembers: (
    departmentId: string,
    userIds: string[]
  ) => Promise<Awaited<ReturnType<typeof replaceDepartmentMembersMutation>>>;
};

async function replaceMembers(departmentId: string, userIds: string[]) {
  return replaceDepartmentMembersMutation(departmentId, userIds, {
    listUsers: () =>
      db
        .select({
          id: allowedUsers.id,
          departmentId: allowedUsers.departmentId,
        })
        .from(allowedUsers),
    replaceAtomically: async (assignedUserIds) => {
      const checkDepartment = () =>
        db
          .select({ id: departments.id })
          .from(departments)
          .where(eq(departments.id, departmentId));
      const clearMembers = db
        .update(allowedUsers)
        .set({ departmentId: null })
        .where(eq(allowedUsers.departmentId, departmentId));

      if (assignedUserIds.length === 0) {
        const [, , , departmentRows] = await db.batch(
          departmentMembershipMutationBatch(
            db.execute(departmentHierarchyLockQuery()),
            checkDepartment(),
            clearMembers,
            checkDepartment()
          )
        );
        return Boolean(departmentRows[0]);
      }

      const [, , , , departmentRows] = await db.batch(
        departmentMembershipMutationBatch(
          db.execute(departmentHierarchyLockQuery()),
          checkDepartment(),
          clearMembers,
          db
            .update(allowedUsers)
            .set({ departmentId })
            .where(
              and(
                inArray(allowedUsers.id, assignedUserIds),
                sql`exists (
                  select 1
                  from ${departments} current_target
                  where current_target.id = ${departmentId}
                )`
              )
            ),
          checkDepartment()
        )
      );
      return Boolean(departmentRows[0]);
    },
  });
}

const productionDependencies: PutDepartmentMembersRouteDependencies = {
  authorize: async () => {
    const session = await auth();
    return Boolean(
      session?.user?.email && (await isAdmin(session.user.email))
    );
  },
  replaceMembers,
};

export async function PUT(
  request: NextRequest,
  { params }: Context,
  dependencies: PutDepartmentMembersRouteDependencies = productionDependencies
) {
  if (!(await dependencies.authorize())) {
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

  const rawUserIds = (body as Record<string, unknown>).userIds;
  if (
    !Array.isArray(rawUserIds) ||
    rawUserIds.some((userId) => typeof userId !== "string" || !userId.trim())
  ) {
    return NextResponse.json(
      { error: "userIds must be an array of user IDs" },
      { status: 400 }
    );
  }
  const userIds = Array.from(
    new Set(rawUserIds.map((userId) => (userId as string).trim()))
  );

  const result = await dependencies.replaceMembers(id, userIds);
  return NextResponse.json(result.body, { status: result.status });
}
