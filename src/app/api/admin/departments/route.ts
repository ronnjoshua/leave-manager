import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedUsers, departments } from "@/lib/db/schema";
import {
  hasSiblingDepartmentName,
  isValidDepartmentParent,
  normalizeDepartmentName,
} from "@/lib/admin-departments";

export const dynamic = "force-dynamic";

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  if ("cause" in error) return databaseErrorCode(error.cause);
  return undefined;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [departmentRows, userRows] = await Promise.all([
    db.select().from(departments).orderBy(asc(departments.name)),
    db
      .select({
        id: allowedUsers.id,
        email: allowedUsers.email,
        isAdmin: allowedUsers.isAdmin,
        departmentId: allowedUsers.departmentId,
      })
      .from(allowedUsers)
      .orderBy(asc(allowedUsers.email)),
  ]);

  const memberCounts = new Map<string, number>();
  for (const user of userRows) {
    if (user.departmentId) {
      memberCounts.set(
        user.departmentId,
        (memberCounts.get(user.departmentId) ?? 0) + 1
      );
    }
  }

  return NextResponse.json({
    departments: departmentRows.map((department) => ({
      ...department,
      memberCount: memberCounts.get(department.id) ?? 0,
    })),
    users: userRows,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
  const nameResult = normalizeDepartmentName(values.name);
  if (!nameResult.ok) {
    return NextResponse.json({ error: nameResult.error }, { status: 400 });
  }

  const rawParentId = values.parentId;
  if (
    rawParentId !== undefined &&
    rawParentId !== null &&
    (typeof rawParentId !== "string" || !rawParentId.trim())
  ) {
    return NextResponse.json({ error: "Invalid parent department" }, { status: 400 });
  }
  const parentId =
    typeof rawParentId === "string" ? rawParentId.trim() : null;

  const departmentRows = await db
    .select({
      id: departments.id,
      name: departments.name,
      parentId: departments.parentId,
    })
    .from(departments);

  if (!isValidDepartmentParent(departmentRows, null, parentId)) {
    return NextResponse.json(
      { error: "Parent department not found" },
      { status: 404 }
    );
  }
  if (
    hasSiblingDepartmentName(
      departmentRows,
      nameResult.name,
      parentId
    )
  ) {
    return NextResponse.json(
      { error: "A department with this name already exists under that parent" },
      { status: 409 }
    );
  }

  try {
    const [createdRows] = await db.batch([
      db
        .insert(departments)
        .values({ name: nameResult.name, parentId })
        .returning(),
    ]);
    return NextResponse.json(createdRows[0], { status: 201 });
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
