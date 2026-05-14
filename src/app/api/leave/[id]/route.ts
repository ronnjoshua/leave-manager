import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveRecords } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const userId = session.user.id;

  const [updated] = await db
    .update(leaveRecords)
    .set({
      startDate: body.startDate,
      endDate: body.endDate,
      days: body.days,
      type: body.type,
      source: body.source,
      reason: body.reason,
      ...(body.status !== undefined && { status: body.status }),
    })
    .where(and(eq(leaveRecords.id, id), eq(leaveRecords.userId, userId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated.id,
    startDate: updated.startDate,
    endDate: updated.endDate,
    days: updated.days,
    type: updated.type,
    source: updated.source,
    reason: updated.reason,
    status: updated.status ?? "actual",
    createdAt: updated.createdAt?.toISOString() ?? new Date().toISOString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  await db
    .delete(leaveRecords)
    .where(and(eq(leaveRecords.id, id), eq(leaveRecords.userId, userId)));

  return NextResponse.json({ ok: true });
}
