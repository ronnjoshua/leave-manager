import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveRecords, leaveSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const settings = await db
    .select()
    .from(leaveSettings)
    .where(eq(leaveSettings.userId, userId));

  const records = await db
    .select()
    .from(leaveRecords)
    .where(eq(leaveRecords.userId, userId))
    .orderBy(leaveRecords.createdAt);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    version: 1,
    settings: settings.map((s) => ({
      year: s.year,
      carryOver: s.carryOver,
      employmentStatus: s.employmentStatus,
      startDate: s.startDate,
    })),
    records: records.map((r) => ({
      year: r.year,
      startDate: r.startDate,
      endDate: r.endDate,
      days: r.days,
      type: r.type,
      source: r.source,
      reason: r.reason,
      status: r.status,
      halfDay: r.halfDay,
      createdAt: r.createdAt?.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();

  if (!body.version || !body.settings || !body.records) {
    return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
  }

  // Clear existing data
  await db.delete(leaveRecords).where(eq(leaveRecords.userId, userId));
  await db.delete(leaveSettings).where(eq(leaveSettings.userId, userId));

  // Restore settings
  for (const s of body.settings) {
    await db.insert(leaveSettings).values({
      userId,
      year: s.year,
      carryOver: s.carryOver,
      employmentStatus: s.employmentStatus ?? "regular",
      startDate: s.startDate ?? null,
    });
  }

  // Restore records
  for (const r of body.records) {
    await db.insert(leaveRecords).values({
      userId,
      year: r.year,
      startDate: r.startDate,
      endDate: r.endDate,
      days: r.days,
      type: r.type,
      source: r.source,
      reason: r.reason,
      status: r.status ?? "actual",
      halfDay: r.halfDay ?? null,
    });
  }

  return NextResponse.json({
    ok: true,
    settingsCount: body.settings.length,
    recordsCount: body.records.length,
  });
}
