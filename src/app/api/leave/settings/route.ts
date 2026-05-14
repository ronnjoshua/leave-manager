import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getYear } from "date-fns";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const userId = session.user.id;
  const currentYear = getYear(new Date());

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.carryOver !== undefined) {
    updates.carryOver = Math.min(Math.max(body.carryOver ?? 0, 0), 5);
  }
  if (body.startDate !== undefined) {
    updates.startDate = body.startDate;
  }

  const existing = await db
    .select()
    .from(leaveSettings)
    .where(
      and(eq(leaveSettings.userId, userId), eq(leaveSettings.year, currentYear))
    );

  if (existing.length > 0) {
    await db
      .update(leaveSettings)
      .set(updates)
      .where(
        and(
          eq(leaveSettings.userId, userId),
          eq(leaveSettings.year, currentYear)
        )
      );
  } else {
    await db.insert(leaveSettings).values({
      userId,
      year: currentYear,
      carryOver: (updates.carryOver as number) ?? 0,
      startDate: (updates.startDate as string) ?? null,
    });
  }

  // Return updated settings
  const [updated] = await db
    .select()
    .from(leaveSettings)
    .where(
      and(eq(leaveSettings.userId, userId), eq(leaveSettings.year, currentYear))
    );

  return NextResponse.json({
    carryOver: updated?.carryOver ?? 0,
    startDate: updated?.startDate ?? null,
  });
}
