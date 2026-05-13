import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveRecords, leaveSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getYear } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentYear = getYear(new Date());
  const userId = session.user.id;

  const [settings] = await db
    .select()
    .from(leaveSettings)
    .where(
      and(eq(leaveSettings.userId, userId), eq(leaveSettings.year, currentYear))
    );

  const records = await db
    .select()
    .from(leaveRecords)
    .where(
      and(eq(leaveRecords.userId, userId), eq(leaveRecords.year, currentYear))
    )
    .orderBy(leaveRecords.createdAt);

  return NextResponse.json({
    year: currentYear,
    carryOver: settings?.carryOver ?? 0,
    records: records.map((r) => ({
      id: r.id,
      startDate: r.startDate,
      endDate: r.endDate,
      days: r.days,
      type: r.type,
      source: r.source,
      reason: r.reason,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const userId = session.user.id;
  const currentYear = getYear(new Date());

  const [record] = await db
    .insert(leaveRecords)
    .values({
      userId,
      year: currentYear,
      startDate: body.startDate,
      endDate: body.endDate,
      days: body.days,
      type: body.type,
      source: body.source,
      reason: body.reason,
    })
    .returning();

  return NextResponse.json({
    id: record.id,
    startDate: record.startDate,
    endDate: record.endDate,
    days: record.days,
    type: record.type,
    source: record.source,
    reason: record.reason,
    createdAt: record.createdAt?.toISOString() ?? new Date().toISOString(),
  });
}
