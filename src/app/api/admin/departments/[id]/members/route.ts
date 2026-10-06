import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedUsers, departments } from "@/lib/db/schema";
import { replaceDepartmentMembers } from "@/lib/admin-departments";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Context) {
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

  const [department] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.id, id));
  if (!department) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  const userRows = await db
    .select({
      id: allowedUsers.id,
      departmentId: allowedUsers.departmentId,
    })
    .from(allowedUsers);
  const knownUserIds = new Set(userRows.map((user) => user.id));
  if (userIds.some((userId) => !knownUserIds.has(userId))) {
    return NextResponse.json(
      { error: "One or more users were not found" },
      { status: 404 }
    );
  }

  const assignments = replaceDepartmentMembers(userRows, id, userIds);
  const assignedUserIds = assignments
    .filter((user) => user.departmentId === id)
    .map((user) => user.id);

  const clearMembers = db
    .update(allowedUsers)
    .set({ departmentId: null })
    .where(eq(allowedUsers.departmentId, id));

  if (assignedUserIds.length === 0) {
    await db.batch([clearMembers]);
  } else {
    await db.batch([
      clearMembers,
      db
        .update(allowedUsers)
        .set({ departmentId: id })
        .where(inArray(allowedUsers.id, assignedUserIds)),
    ]);
  }

  return NextResponse.json({ ok: true, userIds: assignedUserIds });
}
