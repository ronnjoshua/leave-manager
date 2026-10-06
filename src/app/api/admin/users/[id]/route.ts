import { NextRequest, NextResponse } from "next/server";
import { auth, isSuperAdmin } from "@/lib/auth";
import { canManageAllowedUsers } from "@/lib/admin-authorization";
import { db } from "@/lib/db";
import { allowedUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!canManageAllowedUsers(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // The fixed superadmin identity must remain allowed and immutable.
  const [target] = await db
    .select()
    .from(allowedUsers)
    .where(eq(allowedUsers.id, id));

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (isSuperAdmin(target.email)) {
    return NextResponse.json(
      { error: "Cannot remove the superadmin" },
      { status: 400 }
    );
  }

  await db.delete(allowedUsers).where(eq(allowedUsers.id, id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!canManageAllowedUsers(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const isAdmin = (body as Record<string, unknown>).isAdmin;
  if (typeof isAdmin !== "boolean") {
    return NextResponse.json(
      { error: "isAdmin must be a boolean" },
      { status: 400 }
    );
  }

  const { id } = await params;
  const [target] = await db
    .select()
    .from(allowedUsers)
    .where(eq(allowedUsers.id, id));
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (isSuperAdmin(target.email)) {
    return NextResponse.json(
      { error: "Cannot change the superadmin role" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(allowedUsers)
    .set({ isAdmin })
    .where(eq(allowedUsers.id, id))
    .returning();
  return NextResponse.json(updated);
}
