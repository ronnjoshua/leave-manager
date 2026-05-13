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
  const carryOver = Math.min(Math.max(body.carryOver ?? 0, 0), 6);

  const existing = await db
    .select()
    .from(leaveSettings)
    .where(
      and(eq(leaveSettings.userId, userId), eq(leaveSettings.year, currentYear))
    );

  if (existing.length > 0) {
    await db
      .update(leaveSettings)
      .set({ carryOver, updatedAt: new Date() })
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
      carryOver,
    });
  }

  return NextResponse.json({ carryOver });
}
