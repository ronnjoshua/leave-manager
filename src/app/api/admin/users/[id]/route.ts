import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent deleting yourself
  const [target] = await db
    .select()
    .from(allowedUsers)
    .where(eq(allowedUsers.id, id));

  if (target?.email === session.user.email) {
    return NextResponse.json(
      { error: "Cannot remove yourself" },
      { status: 400 }
    );
  }

  await db.delete(allowedUsers).where(eq(allowedUsers.id, id));
  return NextResponse.json({ ok: true });
}
